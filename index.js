const { Customize } = require('tera-data-parser').types;
const keys = [
	'gameId',
	'weapon',
	'body',
	'hand',
	'feet',
	'underwear',
	'head',
	'face',
	'weaponModel',
	'bodyModel',
	'handModel',
	'feetModel',
	'weaponDye',
	'bodyDye',
	'handDye',
	'feetDye',
	'underwearDye',
	'styleBackDye',
	'styleHeadDye',
	'styleFaceDye',
	'weaponEnchant',
	'styleHead',
	'styleFace',
	'styleBack',
	'styleWeapon',
	'styleBody',
	'styleFootprint',
	'styleHeadScale',
	'styleHeadRotation',
	'styleHeadTranslation',
	'styleHeadTranslationDebug',
	'styleFaceScale',
	'styleFaceRotation',
	'styleFaceTranslation',
	'styleFaceTranslationDebug',
	'styleBackScale',
	'styleBackRotation',
	'styleBackTranslation',
	'styleBackTranslationDebug',
	'usedStyleHeadTransform',
	'styleBodyDye',
	'showStyle'
];

module.exports = function surgeon(mod) {
	let userCostumes = {},
		userLoginInfo = {},
		inSurgeonRoom = false,
		newPreset = false,
		marrow = false,
		isLogin = false,
		allIncomingHook = null,
		charId,
		loginMsg = '';

	mod.hook('S_LOGIN', 12, event => {
		isLogin = true;
		marrow = false;
		inSurgeonRoom = false;
		updateUserCostumes(event);
		userLoginInfo = {
			templateId: event.templateId,
			gameId: event.gameId,
			serverId: event.serverId,
			playerId: event.playerId,
			name: event.name,
			race: Math.floor((event.templateId - 10101) / 200),
			gender: Math.floor((event.templateId - 10101) / 100) % 2,
			job: (event.templateId % 100) - 1,
			appearance: (new Customize(event.appearance)),
			details: event.details.toString('hex'),
			shape: event.shape.toString('hex')
		};
		if (mod.settings.characters[event.name]) {
			let preset = Object.assign({}, mod.settings.presets[mod.settings.characters[event.name] - 1]);
			let template = getTemplate(preset.race, preset.gender, userLoginInfo.job);
			if (isCorrectTemplate(template)) {
				event.templateId = template;
				event.appearance = new Customize(preset.appearance);
				event.details = Buffer.from(preset.details, 'hex');
				event.shape = Buffer.from(preset.shape, 'hex');
				loginMsg = `Current preset - ${mod.settings.characters[event.name]}.`;
				return true;
			} else {
				mod.settings.characters[event.name] = 0;
				loginMsg = `Unable to apply preset ${mod.settings.characters[event.name]} (${presetToString(preset.race, preset.gender)}) to ${jobToString(userLoginInfo.job)}, using original appearance.`;
			}
		} else {
			loginMsg = 'Original appearance.';
		}
	});

	mod.hook('S_GET_USER_LIST', 15, { order: 1 }, event => {
		if (inSurgeonRoom) {
			if (allIncomingHook) mod.unhook(allIncomingHook);
			event.characters.forEach(character => {
				if (character.name === userLoginInfo.name) charId = character.id;
			});
			return false;
		} else {
			event.characters.forEach(character => {
				if (mod.settings.characters[character.name] == null) {
					mod.settings.characters[character.name] = 0;
				} else {
					let num = mod.settings.characters[character.name];
					if (num > 0 && num <= mod.settings.presets.length) {
						let preset = mod.settings.presets[mod.settings.characters[character.name] - 1];
						let template = getTemplate(preset.race, preset.gender, character.class);
						if (isCorrectTemplate(template)) {
							character.race = preset.race;
							character.gender = preset.gender;
							character.appearance = new Customize(preset.appearance);
							character.details = Buffer.from(preset.details, 'hex');
							if (preset.shape == '') {
								mod.settings.presets[mod.settings.characters[character.name] - 1].shape = character.shape.toString('hex');
							} else {
								character.shape = Buffer.from(preset.shape, 'hex');
							}
						} else {
							console.log(`Unable to apply preset ${mod.settings.characters[character.name]} (${presetToString(preset.race, preset.gender)}) to character ${character.name} (${jobToString(character.class)})!`);
							mod.settings.characters[character.name] = 0;
						}
					} else {
						mod.settings.characters[character.name] = 0;
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
			} else {
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

	mod.hook('C_COMMIT_CHANGE_USER_APPEARANCE', 2, event => {
		if (inSurgeonRoom) {
			inSurgeonRoom = false;
			mod.send('S_END_CHANGE_USER_APPEARANCE', 1, { ok: 1, unk: 0 });
			let preset = {
				race:		event.race,
				gender:		event.gender,
				appearance:	(new Customize(event.appearance)),
				details:	event.details.toString('hex'),
				shape:		event.shape.toString('hex')
			};
			if (newPreset || !mod.settings.characters[userLoginInfo.name]) {
				newPreset = false;
				mod.settings.presets.push(preset);
				mod.settings.characters[userLoginInfo.name] = mod.settings.presets.length;
			} else {
				Object.assign(mod.settings.presets[mod.settings.characters[userLoginInfo.name] - 1], preset);
			}

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

	mod.hook('S_UNICAST_TRANSFORM_DATA', 5, event => {
		if (event.gameId === userLoginInfo.gameId && mod.settings.characters[userLoginInfo.name] && !event.type && !event.isAppear) {	// type = 0 and isAppear = false for ninja's clone jutsu
			let preset = Object.assign({}, mod.settings.presets[mod.settings.characters[userLoginInfo.name] - 1]);
			updateUserCostumes(event);
			marrow = event.isExpandTransform;
			event.templateId = getTemplate(preset.race, preset.gender, userLoginInfo.job);
			event.appearance = new Customize(preset.appearance);
			event.details = Buffer.from(preset.details, 'hex');
			event.shape = Buffer.from(preset.shape, 'hex');
			return true;
		}
 	});

	mod.hook('S_USER_EXTERNAL_CHANGE', 7, { order: 999, filter: { fake: null }}, event => {
		if (event.gameId === userLoginInfo.gameId) {
			updateUserCostumes(event);
		}
 	});

	mod.hook('S_SPAWN_ME', 'raw', () => {
		if (isLogin) {
			mod.command.message(loginMsg);
			isLogin = false;
		}
	});

	function updateUserCostumes(event) {
		for (let i in keys) {
			userCostumes[keys[i]] = event[keys[i]];
		}
	}

	function surgeonRoom(type, isNewPreset) {
		newPreset = isNewPreset;
		let itemId;
		let preset = {};
		if (mod.settings.characters[userLoginInfo.name]) {
			preset = Object.assign({}, mod.settings.presets[mod.settings.characters[userLoginInfo.name] - 1]);
		} else {
			preset = {
				race:		userLoginInfo.race,
				gender:		userLoginInfo.gender,
				appearance:	(new Customize(userLoginInfo.appearance)),
				details:	userLoginInfo.details,
				shape:		userLoginInfo.shape
			};
		}
		switch (type) {
			case 1: itemId = 168011; break;	// race
			case 2: itemId = 168012; break;	// gender
			case 3: itemId = 168013; break;	// appearance
			default: console.log(`surgeonRoom(type = ${type})`); return;
		}

		if (type == 2 && (preset.race == 4 || preset.race == 5)) {
			mod.command.message('Popori, Elin and Baraka are ineligible for gender change.');
			return;
		}

		mod.send('C_RETURN_TO_LOBBY', 1, {});
		let prepareLobbyHook = mod.hookOnce('S_PREPARE_RETURN_TO_LOBBY', 1, () => {
			inSurgeonRoom = true;
			mod.send('S_START_CHANGE_USER_APPEARANCE', 3, {
				type: type,
				playerId: userLoginInfo.playerId,
				gender: preset.gender,
				race: preset.race,
				class: userLoginInfo.job,
				weapon: userCostumes.weapon,
				chest: userCostumes.body,
				gloves: userCostumes.hand,
				boots: userCostumes.feet,
				appearance: (type == 3 ? (new Customize(preset.appearance)) : 0n),
				weaponEnchantment: 0,
				item: itemId,
				details: Buffer.from(preset.details, 'hex'),
				details2: Buffer.from(preset.shape, 'hex')
			});

			// TODO: do smth with this shit
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

	function getTemplate(race, gender, job) {
		return (10101 + (race * 2 + gender) * 100 + job);
	}

	function isCorrectTemplate(template) {
		let job = (template % 100) - 1;
		switch (job) {	// 101XX/102XX Human, 103xx/104xx High Elf, 105x/106xx Aman, 107xx/108xx Castanic, 109xx/110xx Popori/Elin, 111xx Baraka
			case 8:		// reaper
				return (template == 11009);
			case 9:		// gunner
				return ([10410, 10810, 11010].includes(template));
			case 10:	// brawler
				return ([10111, 10211, 11011].includes(template));
			case 11:	// ninja
				return (template == 11012);
			case 12:	// Valkyrie
				return (template == 10813);
			default:
				return true;
		}
	}

	function presetToString(race, gender) {
		let str = '';
		switch (race) {
			case 0:
				str = 'Human ' + (gender == 0 ? 'female' : 'male');
				break;
			case 1:
				str = 'High Elf ' + (gender == 0 ? 'female' : 'male');
				break;
			case 2:
				str = 'Aman ' + (gender == 0 ? 'female' : 'male');
				break;
			case 3:
				str = 'Castanic ' + (gender == 0 ? 'female' : 'male');
				break;
			case 4:
				str = (gender == 0 ? 'Popori' : 'Elin');
				break;
			case 5:
				str = 'Baraka';
				break;
		}
		return str;
	}

	function jobToString(job) {
		switch (job) {
			case 0:
				return 'Warrior';
			case 1:
				return 'Lancer';
			case 2:
				return 'Slayer';
			case 3:
				return 'Berserker';
			case 4:
				return 'Sorcerer';
			case 5:
				return 'Archer';
			case 6:
				return 'Priest';
			case 7:
				return 'Mystic';
			case 8:
				return 'Reaper';
			case 9:
				return 'Gunner';
			case 10:
				return 'Brawler';
			case 11:
				return 'Ninja';
			case 12:
				return 'Valkyrie';
		}
	}

	function applyPreset(num) {
		let preset = {},
			template;
		if (num) {
			preset = Object.assign({}, mod.settings.presets[num - 1]);
			template = getTemplate(preset.race, preset.gender, userLoginInfo.job);
			if (isCorrectTemplate(template)) {		// if chosen preset can be applied to current character
				mod.settings.characters[userLoginInfo.name] = num;
			} else {
				return false;
			}
		} else {
			mod.settings.characters[userLoginInfo.name] = 0;
			preset = {
				race:		userLoginInfo.race,
				gender:		userLoginInfo.gender,
				appearance:	(new Customize(userLoginInfo.appearance)),
				details:	userLoginInfo.details,
				shape:		userLoginInfo.shape
			};
			template = userLoginInfo.templateId;
		}
		let e = {
			serverId: userLoginInfo.serverId,
			playerId: userLoginInfo.playerId,
			gameId: userLoginInfo.gameId,
			type: 0,
			isExpandTransform: marrow,
			isAppear: false,
			templateId: template,
			appearance: (new Customize(preset.appearance)),
			appearance2: 100,
			details: Buffer.from(preset.details, 'hex'),
			shape: Buffer.from(preset.shape, 'hex')
		};
		Object.assign(e, userCostumes);
		mod.send('S_UNICAST_TRANSFORM_DATA', 5, e);
		return true;
	}

	function loadPreset(param) {
		if (param == null || Number.isNaN(param) || Number(param) < 0) {
			mod.command.message('Invalid preset number!');
			return;
		}
		let num = Number(param);
		if (num > mod.settings.presets.length) {
			mod.command.message(`Invalid preset number! Total count: ${mod.settings.presets.length}`);
			return;
		}
		if (applyPreset(num)) {
			mod.command.message((num == 0 ? 'Appearance reverted to original.' : `Using preset ${num}.`));
		} else {
			let preset = mod.settings.presets[num - 1];
			mod.command.message(`Unable to apply this preset (${presetToString(preset.race, preset.gender)}) to ${jobToString(userLoginInfo.job)}!`);
		}
	}

	function deletePreset(param) {
		if (Number.isNaN(param) || (Number(param) <= 0) || (Number(param) > mod.settings.presets.length)) {
			mod.command.message('Invalid preset number!');
		} else {
			let num = (param == null ? mod.settings.characters[userLoginInfo.name] : Number(param));
			if (num == mod.settings.characters[userLoginInfo.name]) {		// if param was null, or param == current preset number - revert current character appearance
				applyPreset(0);
				mod.command.message(`Preset ${num} deleted, appearance reverted to original.`);
			} else {
				mod.command.message(`Preset ${num} deleted.`);
			}
			mod.settings.presets.splice(num - 1, 1);
			for (let name in mod.settings.characters) {
				if (mod.settings.characters[name] == num) {
					mod.settings.characters[name] = 0;
				}
				if (mod.settings.characters[name] > num) {
					mod.settings.characters[name]--;
				}
			}
		}
	}

	function swapPresets(param) {
		if (Number.isNaN(param) || param == null || Number(param) == 0) {
			mod.command.message('Invalid preset number!');
		} else {
			if (mod.settings.characters[userLoginInfo.name]) {
				let tmp = mod.settings.characters[userLoginInfo.name],
					num = Number(param),
					preset = mod.settings.presets[tmp - 1];
				mod.settings.presets[tmp - 1] = mod.settings.presets[num - 1];
				mod.settings.presets[num - 1] = preset;
				for (let name in mod.settings.characters) {
					if (mod.settings.characters[name] == num) mod.settings.characters[name] = tmp;
					if (mod.settings.characters[name] == tmp) mod.settings.characters[name] = num;
				}
				mod.command.message(`Presets ${tmp} and ${num} were swapped.`);
			} else {
				mod.command.message('Unable to use this command with original appearance!');
			}
		}
	}

	function savePreset() {
		if (!mod.settings.characters[userLoginInfo.name]) {
			mod.settings.presets.push({
				race:		userLoginInfo.race,
				gender:		userLoginInfo.gender,
				appearance:	(new Customize(userLoginInfo.appearance)),
				details:	userLoginInfo.details,
				shape:		userLoginInfo.shape
			});
			mod.command.message(`Preset saved at number ${mod.settings.presets.length}.`);
		}
		else {
			mod.command.message('This preset is already saved.');
		}
	}

	function customAppearance(num1, num2, isNewPreset) {
		if (Number.isNaN(num1) || num1 == null || Number(num1) < 0 || Number(num1) > 7) {
			mod.command.message('Invalid field!');
			return;
		}
		if (Number.isNaN(num2) || num2 == null || Number(num2) <= 0 || Number(num2) > 256) {
			mod.command.message('Invalid value!');
			return;
		}

		let field = Number(num1),
			value = Number(num2) - 1,
			changedField = '',
			str = '',
			preset = {},
			currentNumber;

		currentNumber = mod.settings.characters[userLoginInfo.name];
		if (currentNumber) {
			preset = Object.assign({}, mod.settings.presets[currentNumber - 1]);
			preset.appearance = new Customize(mod.settings.presets[currentNumber - 1].appearance);
			newPreset = isNewPreset;
		} else {
			preset = {
				race:		userLoginInfo.race,
				gender:		userLoginInfo.gender,
				appearance:	(new Customize(userLoginInfo.appearance)),
				details:	userLoginInfo.details,
				shape:		userLoginInfo.shape
			};
			newPreset = true;
		}

		switch (field) {
			case 0:		// dunno what's this
				preset.appearance.unk = value;
				break;
			case 1:
				preset.appearance.skinColor = value;
				changedField = 'Skin color';
				break;
			case 2:
				preset.appearance.faceStyle = value;
				changedField = 'Face type';
				break;
			case 3:
				preset.appearance.faceDecal = value;
				changedField = 'Face decal';
				break;
			case 4:
				preset.appearance.hairStyle = value;
				changedField = 'Hairstyle';
				break;
			case 5:
				preset.appearance.hairColor = value;
				changedField = 'Hair color';
				break;
			case 6:
				preset.appearance.voice = value;
				changedField = 'Voice';
				break;
			case 7:
				preset.appearance.tattoos = value;
				changedField = 'Tattoos';
				break;
		}

		if (newPreset) {
			mod.settings.presets.push(preset);
			mod.settings.characters[userLoginInfo.name] = mod.settings.presets.length;
			str = `new preset saved at number ${mod.settings.presets.length}`;
		} else {
			mod.settings.presets[currentNumber - 1] = Object.assign({}, preset);
			str = `preset ${mod.settings.characters[userLoginInfo.name]} updated`;
		}

		let e = {
			serverId: userLoginInfo.serverId,
			playerId: userLoginInfo.playerId,
			gameId: userLoginInfo.gameId,
			type: 0,
			isExpandTransform: marrow,
			isAppear: false,
			templateId: getTemplate(preset.race, preset.gender, userLoginInfo.job),
			appearance: (new Customize(preset.appearance)),
			appearance2: 100,
			details: Buffer.from(preset.details, 'hex'),
			shape: Buffer.from(preset.shape, 'hex')
		};
		Object.assign(e, userCostumes);
		mod.send('S_UNICAST_TRANSFORM_DATA', 5, e);
		mod.command.message(`${changedField} changed to ${value + 1}, ${str}.`);
	}

	mod.command.add(['surgeon', 'surg'], {
		load(param) {
			loadPreset(param);
		},
		reset() {
			loadPreset(0);
		},
		race() {
			surgeonRoom(1, false);
		},
		gender() {
			surgeonRoom(2, false);
		},
		app() {
			surgeonRoom(3, false);
		},
		skin(param) {
			customAppearance(1, param, false);
		},
		face(param) {
			customAppearance(2, param, false);
		},
		decal(param) {
			customAppearance(3, param, false);
		},
		hair(param) {
			customAppearance(4, param, false);
		},
		haircolor(param) {
			customAppearance(5, param, false);
		},
		voice(param) {
			customAppearance(6, param, false);
		},
		tattoo(param) {
			customAppearance(7, param, false);
		},
		new: {
			race() {
				surgeonRoom(1, true);
			},
			gender() {
				surgeonRoom(2, true);
			},
			app() {
				surgeonRoom(3, true);
			},
			skin(param) {
				customAppearance(1, param, true);
			},
			face(param) {
				customAppearance(2, param, true);
			},
			decal(param) {
				customAppearance(3, param, true);
			},
			hair(param) {
				customAppearance(4, param, true);
			},
			haircolor(param) {
				customAppearance(5, param, true);
			},
			voice(param) {
				customAppearance(6, param, true);
			},
			tattoo(param) {
				customAppearance(7, param, true);
			},
			$none() {
				mod.command.message('Invalid command!');
			},
			$default() {
				mod.command.message('Invalid command!');
			},
		},
		save() {
			savePreset();
		},
		delete(param) {
			deletePreset(param);
		},
		swap(param) {
			swapPresets(param);
		},
		$none() {
			mod.command.message('Commands:');
			mod.command.message('"surg" - show this list;');
			mod.command.message('"surg save" - save current character\'s appearance into preset;');
			mod.command.message('"surg load x" - load preset with specified number (0 - revert to original);');
			mod.command.message('"surg reset" - same as "surg load 0";');
			mod.command.message('"surg delete x" - delete preset with specified number (if number not specified - current preset will be deleted);');
			mod.command.message('"surg swap x" - swap current preset and preset with specified number (yea manual sorting);');
			mod.command.message('"surg app|gender|race" - emulate an appearance/gender/race change for current preset (create new one if used with your original appearance);');
			mod.command.message('"surg skin|face|decal|hair|haircolor|voice|tattoo x" - change your skin tone/face type/decal/hairstyle/hair color/voice/tattoos for current preset (create new one if used with your original appearance);');
			mod.command.message('"surg new app|gender|race" - emulate an appearance/gender/race change, create new preset;');
			mod.command.message('"surg new face|decal|hair|haircolor|voice|tattoo x" - change your skin tone/face type/decal/hairstyle/hair color/voice/tattoos for current preset, create new preset.');
		},
		$default() {
			mod.command.message('Invalid command!');
		},
	}, this);
}