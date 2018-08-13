const path = require('path'),
	fs = require('fs'),
	Command = require('command');

const shapes = {
    size: 7000005,
    chest: 7000012,
    height: 7000013,
    thighs: 7000014
};
	
module.exports = function Surgeon(mod) {
	const command = Command(mod);

	let presets = {},
		usercostumes = {},
		userLoginInfo = {},
		currentPreset = {},
		inSurgeonRoom = false,
		newpreset = false,
		marrow = false,
		charId;
	
	try {
		presets = require('./presets.json');
	} catch(e) {
		presets = { characters: {}, presets: [] };
	}
	
	mod.hook('S_LOGIN', 10, { order: 999 }, event => {
		marrow = false;
		inSurgeonRoom = false;
		updateUserCostumes(event);
		userLoginInfo = {
			templateId: event.templateId,
			gameId: event.gameId,
			serverId: event.serverId,
			playerId: event.playerId,
			name: event.name,
			weapon: event.weapon,
			body: event.body,
			hand: event.hand,
			feet: event.feet,
			underwear: event.underwear,
			appearance: event.appearance,
			details: event.details,
			shape: event.shape,
			race: Math.floor((event.templateId - 10101) / 200),
			gender: Math.floor((event.templateId - 10101) / 100) % 2,
			class: (event.templateId % 100) - 1
		};
		if (presets.characters[event.name].preset) {
			currentPreset = presets.presets[presets.characters[event.name].preset - 1];
			event.templateId = fixModel(currentPreset.race, currentPreset.gender, userLoginInfo.class);
			event.appearance = Number(currentPreset.appearance);
			event.details = Buffer.from(currentPreset.details, 'hex');
		}
		else {
			currentPreset = {
				race: userLoginInfo.race,
				gender: userLoginInfo.gender,
				appearance: userLoginInfo.appearance.toString(),
				details: userLoginInfo.details.toString('hex')
			};
		}
		return true;
	});
	
	mod.hook('S_GET_USER_LIST', 14, { order: 1 }, event => {
		if (inSurgeonRoom) {
			if (allIncomingHook) mod.unhook(allIncomingHook);
			event.characters.forEach(character => {
				if (character.name === userLoginInfo.name) charId = character.id;
			});
			return false;
		}
		else {
			event.characters.forEach(character => {
				if (presets.characters[character.name] == null) {
					presets.characters[character.name] = {
						preset: 0,
						size: 0,
						chest: 0,
						height: 0,
						thighs: 0
					}
					savePresets();
				}
				else {
					if (presets.characters[character.name].preset) {
						let preset = presets.presets[presets.characters[character.name].preset - 1];
						character.race = preset.race;
						character.gender = preset.gender;
						character.appearance = Number(preset.appearance);
						character.details = Buffer.from(preset.details, 'hex');
					}
				}
			});
			return true;
		}
	});
	
	mod.hook('C_CANCEL_CHANGE_USER_APPEARANCE', 1, event => {
		if (inSurgeonRoom) {
			inSurgeonRoom = false;
			mod.send('S_END_CHANGE_USER_APPEARANCE', 1, { ok: 0, unk: 0 });
			if (charId != null) {
				mod.send('C_SELECT_USER', 1, { id: charId, unk: 0 });
				charId = null;
			}
			else {
				mod.hookOnce('S_GET_USER_LIST', 14, { order: 0 }, event => {
					if (allIncomingHook) mod.unhook(allIncomingHook);
					event.characters.forEach(character => {
						if (character.name === userLoginInfo.name) charId = character.id;
					});
					mod.send('C_SELECT_USER', 1, { id: charId, unk: 0 });
					charId = null;
					return false;
				});
			}
			return false;
		}
	});

	mod.hook('C_COMMIT_CHANGE_USER_APPEARANCE', 1, event => {
		if (inSurgeonRoom) {
			inSurgeonRoom = false;
			mod.send('S_END_CHANGE_USER_APPEARANCE', 1, { ok: 1, unk: 0 });
			if (newpreset || !presets.characters[userLoginInfo.name].preset) {
				newpreset = false;
				presets.presets.push({
					race: event.race,
					gender: event.gender,
					appearance: event.appearance.toString(),
					details: event.details.toString('hex')
				});
				presets.characters[userLoginInfo.name].preset = presets.presets.length;
			} else {
				presets.presets[presets.characters[userLoginInfo.name].preset - 1].race = event.race;
				presets.presets[presets.characters[userLoginInfo.name].preset - 1].gender = event.gender;
				presets.presets[presets.characters[userLoginInfo.name].preset - 1].appearance = event.appearance.toString();
				presets.presets[presets.characters[userLoginInfo.name].preset - 1].details = event.details.toString('hex');
			}
			savePresets();
			if (charId != null) {
				mod.send('C_SELECT_USER', 1, { id: charId, unk: 0 });
				charId = null;
			}
			else {
				mod.hookOnce('S_GET_USER_LIST', 14, { order: 0 }, event => {
					if (allIncomingHook) mod.unhook(allIncomingHook);
					event.characters.forEach(character => {
						if (character.name === userLoginInfo.name) charId = character.id;
					});
					mod.send('C_SELECT_USER', 1, { id: charId, unk: 0 });
					charId = null;
					return false;
				});
			}
			return false;
		}
	});
	
	mod.hook('S_UNICAST_TRANSFORM_DATA', 3, { order: -1, filter: { fake: false }}, event => {
		if (event.gameId.equals(userLoginInfo.gameId) && presets.characters[userLoginInfo.name].preset) {
			marrow = (event.unk1 ? true : false);
			userLoginInfo.shape = event.shape;
			event.templateId = fixModel(currentPreset.race, currentPreset.gender, userLoginInfo.class);
			event.appearance = Number(currentPreset.appearance);
			event.details = Buffer.from(currentPreset.details, 'hex');
			return false;
		}
 	});

	mod.hook('S_USER_EXTERNAL_CHANGE', 6, { order: 999, filter: { fake: null }}, event => {
		if (event.gameId.equals(userLoginInfo.gameId) && presets.characters[userLoginInfo.name].preset) {
			updateUserCostumes(event);
			applyPreset(presets.characters[userLoginInfo.name].preset - 1, marrow);
		}
 	});
	
	function surgeonRoom(type) {
		let itemId;
		switch (type) {
			case 1: itemId = 168011; break;	// race
			case 2: itemId = 168012; break;	// gender
			case 3: itemId = 168013; break;	// appearance
			default: console.log(`surgeonRoom(type = ${type})`); return;
		}
		
		if (type == 2 && (currentPreset.race == 4 || currentPreset.race == 5)) {
			command.message('Popori, Elin and Baraka are ineligible for gender change.');
			return;
		}

		mod.send('C_RETURN_TO_LOBBY', 1, {});
		let prepareLobbyHook = mod.hookOnce('S_PREPARE_RETURN_TO_LOBBY', 1, () => {
			inSurgeonRoom = true;
			mod.send('S_START_CHANGE_USER_APPEARANCE', 2, {
				type: type,
				playerId: userLoginInfo.playerId,
				gender: currentPreset.gender,
				race: currentPreset.race,
				class: userLoginInfo.class,
				weapon: userLoginInfo.weapon,
				chest: userLoginInfo.body,
				gloves: userLoginInfo.hand,
				boots: userLoginInfo.feet,
				// innerwear: userLoginInfo.underwear,
				appearance: (type == 3 ? Number(currentPreset.appearance) : 0),
				weaponEnchantment: 0,
				item: itemId,
				details: Buffer.from(currentPreset.details, 'hex')
			});

			allIncomingHook = mod.hook('*', 'raw', { order: 2, filter: { incoming: true }}, () => {
				return false;
			});

			setTimeout(() => {
				if (allIncomingHook) mod.unhook(allIncomingHook);
			}, 10000);
		});
		
		setTimeout(() => {
			if (prepareLobbyHook) mod.unhook(prepareLobbyHook);
		}, 5000);
	}
	
	function fixModel(race, gender, job) {
		let cmodel = 10101 + (race * 200) + job;
		cmodel += (gender == 1 ? 100 : 0);
		switch (job) {	// 101XX/102XX Human, 103xx/104xx High Elf, 105x/106xx Aman, 107xx/108xx Castanic, 109xx/110xx Popori/Elin, 111xx Baraka
			case 8:		// reaper
				if (cmodel != 11009) cmodel = 11009;
				break;
			case 9:		// gunner
				if (cmodel != 10410 && cmodel != 10810 && cmodel != 11010) cmodel = 10810;
				break;
			case 10:	// brawler
				if (cmodel != 10111 && cmodel != 10211) cmodel = 10111;
				break;
			case 11:	// ninja
				if (cmodel != 11012) cmodel = 11012;
				break;
			case 12:	// Valkyrie
				if (cmodel != 10813) cmodel = 10813;
				break;
		}
		return cmodel;
	}
	
	function changeShape(type, stacks) {
		let abnormId;
		switch (type) {
			case 0:
				abnormId = shapes['size'];
				presets.characters[userLoginInfo.name].size = stacks - 4;
				break;
			case 1:
				if (!currentPreset.gender) {
					command.message('Male characters are ineligible for chest size change.');
					return;
				}
				else {
					abnormId = shapes['chest'];
					presets.characters[userLoginInfo.name].chest = stacks - 4;
				}
				break;
			case 2:
				abnormId = shapes['height'];
				presets.characters[userLoginInfo.name].height = stacks - 4;
				break;
			case 3:
				if (!currentPreset.gender) {
					command.message('Male characters are ineligible for thigh size change.');
					return;
				}
				else {
					abnormId = shapes['thighs'];
					presets.characters[userLoginInfo.name].thighs = stacks - 4;
				}
				break;
			default: console.log(`changeShape(type = ${type})`); return;
		}
		mod.send('S_ABNORMALITY_END', 1, {
			target: userLoginInfo.gameId,
			id: abnormId,
		});
		if (stacks != 4)
			mod.send('S_ABNORMALITY_BEGIN', 2, {
				target: userLoginInfo.gameId,
				source: userLoginInfo.gameId,
				id: abnormId,
				duration: 2147483647,
				unk: 0,
				stacks: stacks,
				unk2: 0,
			});
		savePresets();
	}
	
	function resetShape() {
		for (let i in shapes) {
			mod.send('S_ABNORMALITY_END', 1, {
				target: userLoginInfo.gameId,
				id: shapes[i],
			});
		};
	}
	
	function applyPreset(num, mar) {
		// let model = fixModel(presets.presets[num].race, presets.presets[num].gender, userLoginInfo.class);
		let prevPreset = presets.characters[userLoginInfo.name].preset;
		presets.characters[userLoginInfo.name].preset = (num < 0 ? 0 : num + 1);
		if (num < 0) {
			currentPreset = {
				race: userLoginInfo.race,
				gender: userLoginInfo.gender,
				appearance: userLoginInfo.appearance.toString(),
				details: userLoginInfo.details.toString('hex')
			};
		}
		else {
			currentPreset = presets.presets[num];
		}
		let e = {
			serverId: userLoginInfo.serverId,
			playerId: userLoginInfo.playerId,
			gameId: userLoginInfo.gameId,
			type: 0,
			unk1: mar,
			unk2: true,
			templateId: fixModel(currentPreset.race, currentPreset.gender, userLoginInfo.class),
			appearance: Number(currentPreset.appearance),
			appearance2: 100,
			details: Buffer.from(currentPreset.details, 'hex'),
			shape: userLoginInfo.shape
		};
		Object.assign(e, usercostumes);
		mod.send('S_UNICAST_TRANSFORM_DATA', 3, e);
		if (!prevPreset) {
			updateUserCostumes(usercostumes);
			applyPreset(presets.characters[userLoginInfo.name].preset - 1, marrow);
			
			e = {
				gameId: userLoginInfo.gameId,
			};
			Object.assign(e, usercostumes);
			mod.send('S_USER_EXTERNAL_CHANGE', 6, e);
		}
	}
	
	function updateUserCostumes(event) {
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
	
	command.add('surgeon', (param1, param2) => {
		if (param1 == null) {
			command.message('Commands:');
			command.message('"surgeon load [x]" - load your saved preset slot x, 0 - revert to original.');
			command.message('"surgeon race" - Emulates a race change. Will cause desyncs when using skills unless the racial skill animation is almost identical.');
			command.message('"surgeon gender" - Emulates a gender change. Will cause desyncs when using skills unless the racial skill animation is almost identical.');
			command.message('"surgeon face" - Emulates an appearance change; edits current preset, or creates new preset if used with your true appearance.');
			command.message('"surgeon new race" - Does the same as "surgeon race"; creates new preset.');
			command.message('"surgeon new gender" - Does the same as "surgeon gender"; creates new preset.');
			command.message('"surgeon new face" - Does the same as "surgeon face"; creates new preset.');
		}
		else {
			switch (param1) {
				case 'load':
					let num = (param2 == null ? 0 : Number(param2));
					if (num == 0) {
						
						applyPreset(-1, marrow);
						savePresets();
						command.message('Appearance reverted.');
					} else if (num > presets.presets.length) {
						command.message('Invalid Preset. Does not exist.');
					} else {
						
						applyPreset(num - 1, marrow);
						savePresets();
						command.message(`Using preset ${num}`);
					}
					break;
				case 'race': newpreset = false; surgeonRoom(1); break;
				case 'gender': newpreset = false; surgeonRoom(2); break;
				case 'app':
				case 'appearance':
				case 'face': newpreset = false; surgeonRoom(3); break;
				case 'new':
					newpreset = true;
					switch (param2) {
						case 'race': surgeonRoom(1); break;
						case 'gender': surgeonRoom(2); break;
						case 'app':
						case 'appearance':
						case 'face': surgeonRoom(3); break;
					}
					break;
				case 'save':
					if (!presets.characters[userLoginInfo.name].preset) {
						presets.presets.push({
							race: userLoginInfo.race,
							gender: userLoginInfo.gender,
							appearance: userLoginInfo.appearance.toString(),
							details: userLoginInfo.details.toString('hex')
						});
						command.message(`Preset saved at number ${presets.presets.length}.`);
						savePresets();
					}
					else {
						command.message('This preset is already saved.');
					}
					break;
				case 'size': changeShape(0, Number(param2) + 4); break;
				case 'chest':
				case 'breast':
				case 'breasts': changeShape(1, Number(param2) + 4); break;
				case 'height': changeShape(2, Number(param2) + 4); break;
				case 'thigh':
				case 'thighs': changeShape(3, Number(param2) + 4); break;
				case 'reset':
					if (param2 == null) {
						// presets.characters[userLoginInfo.name].preset = 0;
						applyPreset(-1, marrow);
						savePresets();
						command.message('Appearance reverted.');
					}
					else {
						switch (param2) {
							case 'all': resetShape();
							case 'race':
							case 'face':
							case 'app':
							case 'appearance':
								// presets.characters[userLoginInfo.name].preset = 0;
								applyPreset(-1, marrow);
								savePresets();
								command.message('Appearance reverted.');
								break;
							case 'shape': resetShape(); break;
							default: 
								command.message('Invalid command!');
						}
					}
					break;
				default:
					command.message('Invalid command!');
			}
		}
	});

	function savePresets() {
		fs.writeFileSync(path.join(__dirname, 'presets.json'), JSON.stringify(presets, null, '\t'));
	}
}