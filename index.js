const path = require('path'),
	fs = require('fs'),
	Command = require('command');

module.exports = function Surgeon(dispatch) {
	const command = Command(dispatch);

	let userlogininfo = null,
		usercostumes = {},
		inSurgeonRoom = false,
		inLobby = false,
		leaveRoom = false,
		newpreset = false,
		stack = -1,
		positions = {},
		marrow = false,
		currpreset,
		charId,
		customApp = {},
		userListHook

	try {
		customApp = require('./presets.json');
		UpdatePresets();
	} catch(e) {
		try {
			customApp = require('./app.json');
			UpdatePresets();
			fs.renameSync(path.join(__dirname, 'app.json'), path.join(__dirname, 'presets.json'));
		} catch(e) { customApp = {version: 1, characters: {}, presets: []}; }
	}

	function UpdatePresets() {
		if (!customApp.version) customApp.version = 1	// initialize the preset version to 1 if it does not exist
		for (let i in customApp.presets) {
			if (customApp.presets[i].app) {	// rename app to appearance
				customApp.presets[i].appearance = customApp.presets[i].app;
				delete customApp.presets[i].app;
			}
			if (customApp.presets[i].details.data) {	// older version; change the array typed details to hex
				let retbuffer = customApp.presets[i].details.data;
				delete customApp.presets[i].details;
				customApp.presets[i].details = Buffer.from(retbuffer).toString('hex');
			}
		}
		saveCustom();
	}

	// ############# //
	// ### Magic ### //
	// ############# //

	// For stability reasons, let AA registers your true race and gender first
	dispatch.hook('S_LOGIN', 10, { order: 1 }, event => {
		userlogininfo = Object.assign({}, event);
		Object.assign(userlogininfo, {
			race: Math.floor((event.templateId - 10101) / 200),
			gender: Math.floor((event.templateId - 10101) / 100) % 2,
			class: (event.templateId % 100) - 1,
			serverId: event.serverId,
			playerId: event.playerId,
			gameId: event.gameId,
			name: event.name,
			surgeon_race: Math.floor((event.templateId - 10101) / 200),
			surgeon_gender: Math.floor((event.templateId - 10101) / 100) % 2,
			surgeon_appearance: event.appearance,
			surgeon_details: event.details
		})
		inSurgeonRoom = false;
		inLobby = false;
		newpreset = false;
		marrow = false;
		UpdateUserCostumes(event);
		checkMeincustomApp(userlogininfo.name);
		if (customApp.characters[userlogininfo.name]) {
			currpreset = customApp.presets[customApp.characters[userlogininfo.name] - 1];
			let fix = fixModel(currpreset.race, currpreset.gender, userlogininfo.class);
			event.appearance = currpreset.appearance;
			event.templateId = fix[3];
			event.details = Buffer.from(currpreset.details, 'hex');
			Object.assign(userlogininfo, {
				surgeon_race: fix[0],
				surgeon_gender: fix[1],
				surgeon_appearance: currpreset.appearance,
				surgeon_details: Buffer.from(currpreset.details, 'hex')
			});
		}

		if (customApp.characters[userlogininfo.name]) return true;
	});

	dispatch.hook('S_USER_EXTERNAL_CHANGE', 6, { order: 999, filter: {fake: null}}, event => {
		if (event.gameId.equals(userlogininfo.gameId) && customApp.characters[userlogininfo.name]) {
			UpdateUserCostumes(event);
			ChangeAppearance(customApp.characters[userlogininfo.name] - 1, marrow);
		}
 	});

	// Marrow fix
	dispatch.hook('S_UNICAST_TRANSFORM_DATA', 3, { order: -1 }, event => {
		if (event.gameId.equals(userlogininfo.gameId) && customApp.characters[userlogininfo.name]) {
			marrow = (event.unk1 ? true : false);
			userlogininfo.shape = event.shape;
			ChangeAppearance(customApp.characters[userlogininfo.name] - 1, marrow);
			return false;
		}
 	});

	dispatch.hook('S_GET_USER_LIST', 14, { order: 0 }, (event) => {
		for (let indexx in event.characters) {
			let charname = event.characters[indexx].name;
			checkMeincustomApp(charname);
			if (customApp.characters[charname]) {
				let currpreset = customApp.presets[customApp.characters[charname] - 1];
				let fix = fixModel(currpreset.race, currpreset.gender, event.characters[indexx].job);
				event.characters[indexx].race = fix[0];
				event.characters[indexx].gender = fix[1];
				event.characters[indexx].appearance = currpreset.appearance;
				event.characters[indexx].details = Buffer.from(currpreset.details, 'hex');
			}
		}
		return true;
	});

	dispatch.hook('C_CANCEL_CHANGE_USER_APPEARANCE', 1, event => {
		if (inSurgeonRoom) {
			inSurgeonRoom = false;
			dispatch.send('S_END_CHANGE_USER_APPEARANCE', 1, {
				ok: 0,
				unk: 0
			});
			if (inLobby) dispatch.send('C_SELECT_USER', 1, { id: charId, unk: 0 });	// 2nd part of ugliness 
			else leaveRoom = true;
			return false;
		}
	});

	dispatch.hook('C_COMMIT_CHANGE_USER_APPEARANCE', 1, event => {
		if (inSurgeonRoom) {
			inSurgeonRoom = false;
			dispatch.send('S_END_CHANGE_USER_APPEARANCE', 1, {
				ok: 1,
				unk: 0
			});
			if (newpreset || !customApp.characters[userlogininfo.name]) {
				newpreset = false;
				customApp.presets.push({
					race: event.race,
					gender: event.gender,
					appearance: event.appearance,
					details: event.details.toString('hex')
				});
				customApp.characters[userlogininfo.name] = customApp.presets.length;
			} else {
				customApp.presets[customApp.characters[userlogininfo.name] - 1].race = event.race;
				customApp.presets[customApp.characters[userlogininfo.name] - 1].gender = event.gender;
				customApp.presets[customApp.characters[userlogininfo.name] - 1].appearance = event.appearance;
				customApp.presets[customApp.characters[userlogininfo.name] - 1].details = event.details.toString('hex');
			}
			saveCustom();
			if (inLobby) dispatch.send('C_SELECT_USER', 1, { id: charId, unk: 0 }); // same as above
			else leaveRoom = true;
			return false;
		}
	});

	// ######################## //
	// ### Helper Functions ### //
	// ######################## //

	function SurgeonRoom(room, itemid) {
		if (room == 2 && (userlogininfo.surgeon_race == 4 || userlogininfo.surgeon_race == 5)) {
			command.message('Popori, Elin and Baraka are ineligible for gender change');
			return;
		}

		dispatch.send('C_RETURN_TO_LOBBY', 1, {});
		let prepareLobbyHook = dispatch.hookOnce('S_PREPARE_RETURN_TO_LOBBY', 1, () => {
			inSurgeonRoom = true;
			dispatch.send('S_START_CHANGE_USER_APPEARANCE', 2, {
				type: room,
				playerId: userlogininfo.playerId,
				gender: userlogininfo.surgeon_gender,
				race: userlogininfo.surgeon_race,
				class: userlogininfo.class,
				weapon: userlogininfo.weapon,
				chest: userlogininfo.body,
				gloves: userlogininfo.hand,
				boots: userlogininfo.feet,
				innerwear: userlogininfo.innerwear,
				appearance: (room == 3 ? userlogininfo.surgeon_appearance : 0),
				weaponEnchantment: 0,
				item: itemid,
				details: userlogininfo.surgeon_details,
				details2: userlogininfo.shape
			});

			userListHook = dispatch.hook('*', 'raw', { order: 999, filter: { incoming: true }}, () => {
				return false;
			});
			
			// to prevent unpredictable behavior if you try to leave room before server sends you character list
			// (looks ugly af, but i have no any idea how to implement this in a different way)
			// actually, it doesn't make much sense because it takes half of this time to load the room (maybe it'll be faster on ssd)
			dispatch.hookOnce('S_GET_USER_LIST', 14, { order: -1 }, event => {
				inLobby = true;
				dispatch.unhook(userListHook);
				event.characters.forEach(character => {
					if (character.name === userlogininfo.name) charId = character.id;
				});
				
				if (leaveRoom) {
					dispatch.send('C_SELECT_USER', 1, { id: charId, unk: 0 });
					leaveRoom = false;
				}
				return false;
			});

			setTimeout(() => {
				if (userListHook) dispatch.unhook(userListHook);
			}, 10000);
		});
		
		setTimeout(() => {
			if (prepareLobbyHook) dispatch.unhook(prepareLobbyHook);
		}, 5000);
	}
	
	function checkMeincustomApp(p) {
		if (!customApp.characters[p]) customApp.characters[p] = 0;
		if (customApp.characters[p] > customApp.presets.length) customApp.characters[p] = 0;
	}

	function fixModel(race, gender, job) {
		let cmodel = 10101 + (race * 200) + job;
		cmodel += (gender == 1 ? 100 : 0);
		let correction = [race,gender,job,cmodel];
		switch (job) {	// 101XX/102XX Human, 103xx/104xx High Elf, 105x/106xx Aman, 107xx/108xx Castanic, 109xx/110xx Popori/Elin, 111xx Baraka
			case 8:		// reaper
				if (cmodel != 11009) correction = [4,1,8,11009];
				break;
			case 9:		// gunner
				if (cmodel != 10410 && cmodel != 10810 && cmodel != 11010) correction = [3,1,9,10810];
				break;
			case 10:	// brawler
				if (cmodel != 10111 && cmodel != 10211) correction = [0,0,10,10111];
				break;
			case 11:	// ninja
				if (cmodel != 11012) correction = [4,1,11,11012];
				break;
			case 12:	// Valkyrie
				if (cmodel != 10813) correction = [3,1,12,10813];
				break;
		}
		return correction;
	}

	function UpdateUserCostumes(event) {
		usercostumes = {
			weapon,
			body,
			hand,
			feet,
			underwear,
			head,
			face,
			weaponModel,
			bodyModel,
			handModel,
			feetModel,
			weaponDye,
			bodyDye,
			handDye,
			feetDye,
			underwearDye,
			styleBackDye,
			styleHeadDye,
			styleFaceDye,
			weaponEnchant,
			styleHead,
			styleFace,
			styleBack,
			styleWeapon,
			styleBody,
			styleFootprint,
			styleHeadScale,
			styleHeadRotation,
			styleHeadTranslation,
			styleHeadTranslationDebug,
			styleFaceScale,
			styleFaceRotation,
			styleFaceTranslation,
			styleFaceTranslationDebug,
			styleBackScale,
			styleBackRotation,
			styleBackTranslation,
			styleBackTranslationDebug,
			accessoryTransformUnk,
			styleBodyDye,
			showStyle
		} = event;
	}

	function ChangeAppearance(index, marrow) {
		if (index < 0) {
			let fix = fixModel(userlogininfo.race, userlogininfo.gender, userlogininfo.class);
			let e = {
				serverId: userlogininfo.serverId,
				playerId: userlogininfo.playerId,
				gameId: userlogininfo.gameId,
				type: 0,
				unk1: marrow,
				unk2: true,
				templateId: fix[3],
				appearance: userlogininfo.appearance,
				appearance2: 100,
				details: userlogininfo.details,
				shape: userlogininfo.shape
			}
			Object.assign(e, usercostumes);
			Object.assign(userlogininfo, {
				surgeon_race: userlogininfo.race,
				surgeon_gender: userlogininfo.gender,
				surgeon_appearance: userlogininfo.appearance,
				surgeon_details: userlogininfo.details
			});
			dispatch.send('S_UNICAST_TRANSFORM_DATA', 3, e);
		} else {
			let currpreset = customApp.presets[index];
			let fix = fixModel(currpreset.race, currpreset.gender, userlogininfo.class);
			let e = {
				serverId: userlogininfo.serverId,
				playerId: userlogininfo.playerId,
				gameId: userlogininfo.gameId,
				type: 0,
				unk1: marrow,
				unk2: true,
				templateId: fix[3],
				appearance: currpreset.appearance,
				appearance2: 100,
				details: Buffer.from(currpreset.details, 'hex'),
				shape: userlogininfo.shape
			}
			Object.assign(e, usercostumes);
			Object.assign(userlogininfo, {
				surgeon_race: fix[0],
				surgeon_gender: fix[1],
				surgeon_appearance: currpreset.appearance,
				surgeon_details: Buffer.from(currpreset.details, 'hex')
			})
			dispatch.send('S_UNICAST_TRANSFORM_DATA', 3, e);
		}
	}

	// ################# //
	// ### Chat Hook ### //
	// ################# //

	command.add('surgeon', (param, number, num2) => {
		switch (param) {
		case 'load':
			stack = (number == null ? 0 : Number(number));
			if (stack <= 0) {
				customApp.characters[userlogininfo.name] = 0;
				ChangeAppearance(-1, marrow);
				saveCustom();
				command.message('Appearance reverted.');
			} else if (stack > customApp.presets.length) {
				command.message('Invalid Preset. Does not exist.');
			} else {
				customApp.characters[userlogininfo.name] = stack;
				ChangeAppearance(stack - 1, marrow);
				saveCustom();
				command.message('Using preset '+stack);
			}
			break;
		case 'race': newpreset = false; SurgeonRoom(1, 168011); break;
		case 'gender': newpreset = false; SurgeonRoom(2, 168012); break;
		case 'face': newpreset = false; SurgeonRoom(3, 168013); break;
		case 'new':
			newpreset = true;
			switch (number) {
				case 'race': SurgeonRoom(1, 168011); break;
				case 'gender': SurgeonRoom(2, 168012); break;
				case 'face': SurgeonRoom(3, 168013); break;
			}
			break;
		default:
			command.message('Commands:');
			command.message('"surgeon load [x]" - load your saved preset slot x, 0 - revert to original.');
			command.message('"surgeon race" - Emulates a race change. Will cause desyncs when using skills unless the racial skill animation is almost identical.');
			command.message('"surgeon gender" - Emulates a gender change. Will cause desyncs when using skills unless the racial skill animation is almost identical.');
			command.message('"surgeon face" - Emulates an appearance change; edits current preset, or creates new preset if used with your "true" appearance.');
			command.message('"surgeon new race" - Does the same as "surgeon race"; creates new preset.');
			command.message('"surgeon new gender" - Does the same as "surgeon gender"; creates new preset.');
			command.message('"surgeon new face" - Does the same as "surgeon face"; creates new preset.');
		}
	});

	function saveCustom() {
		fs.writeFileSync(path.join(__dirname, 'presets.json'), JSON.stringify(customApp, null, '\t'));
	}
}