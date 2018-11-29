module.exports = function surgeon(mod) {
	let userCostumes = {},
		userLoginInfo = {},
		currentPreset = {},
		inSurgeonRoom = false,
		newPreset = false,
		marrow = false,
		userListHook = null,
		charId;

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
		let loginMsg;
		if (mod.settings.characters[event.name]) {
			let preset = mod.settings.presets[mod.settings.characters[event.name] - 1];
			let template = getTemplate(preset.race, preset.gender, userLoginInfo.class);
			if (isCorrectTemplate(template)) {
				currentPreset = preset;
				event.templateId = template;
				event.appearance = Number(preset.appearance);
				event.details = Buffer.from(preset.details, 'hex');
				loginMsg = `Current preset - ${mod.settings.characters[event.name]}.`;
			} else {
				mod.settings.characters[event.name] = 0;
				loginMsg = `Unable to apply preset ${mod.settings.characters[event.name]} (${presetToString(preset.race, preset.gender)}) to ${jobToString(userLoginInfo.class)}, using original appearance.`;
			}
		} else {
			currentPreset = {
				race: userLoginInfo.race,
				gender: userLoginInfo.gender,
				appearance: userLoginInfo.appearance.toString(),
				details: userLoginInfo.details.toString('hex')
			};
			loginMsg = 'Original appearance.';
		}
		mod.hookOnce('S_SPAWN_ME', 'raw', () => {
			mod.command.message(loginMsg);
		});
		return true;
	});

	mod.hook('S_GET_USER_LIST', 14, { order: 1 }, event => {
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
					if (mod.settings.characters[character.name]) {
						let preset = mod.settings.presets[mod.settings.characters[character.name] - 1];
						let template = getTemplate(preset.race, preset.gender, character.class);
						if (isCorrectTemplate(template)) {
							character.race = preset.race;
							character.gender = preset.gender;
							character.appearance = Number(preset.appearance);
							character.details = Buffer.from(preset.details, 'hex');
						} else {
							console.log(`Unable to apply preset ${mod.settings.characters[character.name]} (${presetToString(currentPreset.race, currentPreset.gender)}) to character ${character.name} (${jobToString(userLoginInfo.class)})!`);
							mod.settings.characters[character.name] = 0;
						}
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

	mod.hook('C_COMMIT_CHANGE_USER_APPEARANCE', 1, event => {
		if (inSurgeonRoom) {
			inSurgeonRoom = false;
			mod.send('S_END_CHANGE_USER_APPEARANCE', 1, { ok: 1, unk: 0 });
			if (newPreset || !mod.settings.characters[userLoginInfo.name]) {
				newPreset = false;
				mod.settings.presets.push({
					race: event.race,
					gender: event.gender,
					appearance: event.appearance.toString(),
					details: event.details.toString('hex')
				});
				mod.settings.characters[userLoginInfo.name] = mod.settings.presets.length;
			} else {
				mod.settings.presets[mod.settings.characters[userLoginInfo.name] - 1].race = event.race;
				mod.settings.presets[mod.settings.characters[userLoginInfo.name] - 1].gender = event.gender;
				mod.settings.presets[mod.settings.characters[userLoginInfo.name] - 1].appearance = event.appearance.toString();
				mod.settings.presets[mod.settings.characters[userLoginInfo.name] - 1].details = event.details.toString('hex');
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

	mod.hook('S_UNICAST_TRANSFORM_DATA', 3, { order: -1, filter: { fake: false }}, event => {
		if (event.gameId === userLoginInfo.gameId && mod.settings.characters[userLoginInfo.name]) {
			marrow = event.unk1;
			userLoginInfo.shape = event.shape;
			event.templateId = getTemplate(currentPreset.race, currentPreset.gender, userLoginInfo.class);
			event.appearance = Number(currentPreset.appearance);
			event.details = Buffer.from(currentPreset.details, 'hex');
			return true;
		}
 	});

	mod.hook('S_USER_EXTERNAL_CHANGE', 6, { order: 999, filter: { fake: null }}, event => {
		if (event.gameId === userLoginInfo.gameId && mod.settings.characters[userLoginInfo.name]) {
			updateUserCostumes(event);
			applyPreset(mod.settings.characters[userLoginInfo.name]);
		}
 	});

	function surgeonRoom(type, isNewPreset) {
		newPreset = isNewPreset;
		let itemId;
		switch (type) {
			case 1: itemId = 168011; break;	// race
			case 2: itemId = 168012; break;	// gender
			case 3: itemId = 168013; break;	// appearance
			default: console.log(`surgeonRoom(type = ${type})`); return;
		}

		if (type == 2 && (currentPreset.race == 4 || currentPreset.race == 5)) {
			mod.command.message('Popori, Elin and Baraka are ineligible for gender change.');
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
		return (10101 + (race * 200) + job + (gender == 1 ? 100 : 0));
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
				str = "Human " + (gender == 0 ? "female" : "male");
				break;
			case 1:
				str = "High Elf " + (gender == 0 ? "female" : "male");
				break;
			case 2:
				str = "Aman " + (gender == 0 ? "female" : "male");
				break;
			case 3:
				str = "Castanic " + (gender == 0 ? "female" : "male");
				break;
			case 4:
				str = (gender == 0 ? "Popori" : "Elin");
				break;
			case 5:
				str = "Baraka";
				break;
		}
		return str;
	}

	function jobToString(job) {
		switch (job) {
			case 0:
				return "Warrior";
			case 1:
				return "Lancer";
			case 2:
				return "Slayer";
			case 3:
				return "Berserker";
			case 4:
				return "Sorcerer";
			case 5:
				return "Archer";
			case 6:
				return "Priest";
			case 7:
				return "Mystic";
			case 8:
				return "Reaper";
			case 9:
				return "Gunner";
			case 10:
				return "Brawler";
			case 11:
				return "Ninja";
			case 12:
				return "Valkyrie";
		}
	}

	function applyPreset(num) {
		let prevPreset = mod.settings.characters[userLoginInfo.name];
		if (num == 0) {		// revert appearance to original
			mod.settings.characters[userLoginInfo.name] = 0;
			currentPreset = {
				race: userLoginInfo.race,
				gender: userLoginInfo.gender,
				appearance: userLoginInfo.appearance.toString(),
				details: userLoginInfo.details.toString('hex')
			};
			let e = {
				serverId: userLoginInfo.serverId,
				playerId: userLoginInfo.playerId,
				gameId: userLoginInfo.gameId,
				type: 0,
				unk1: marrow,
				unk2: true,
				templateId: userLoginInfo.templateId,
				appearance: userLoginInfo.appearance,
				appearance2: 100,
				details: userLoginInfo.details,
				shape: userLoginInfo.shape
			};
			Object.assign(e, userCostumes);
			mod.send('S_UNICAST_TRANSFORM_DATA', 3, e);
			return true;
		} else {			// load preset
			let template = getTemplate(mod.settings.presets[num - 1].race, mod.settings.presets[num - 1].gender, userLoginInfo.class);
			if (isCorrectTemplate(template)) {		// if chosen preset can be applied to current character
				mod.settings.characters[userLoginInfo.name] = num;
				currentPreset = mod.settings.presets[num - 1];
				let e = {
					serverId: userLoginInfo.serverId,
					playerId: userLoginInfo.playerId,
					gameId: userLoginInfo.gameId,
					type: 0,
					unk1: marrow,
					unk2: true,
					templateId: template,
					appearance: Number(currentPreset.appearance),
					appearance2: 100,
					details: Buffer.from(currentPreset.details, 'hex'),
					shape: userLoginInfo.shape
				};
				Object.assign(e, userCostumes);
				mod.send('S_UNICAST_TRANSFORM_DATA', 3, e);
				if (!prevPreset) {
					// updateUserCostumes(userCostumes);
					// applyPreset(mod.settings.characters[userLoginInfo.name] - 1);
					e = {
						gameId: userLoginInfo.gameId,
					};
					Object.assign(e, userCostumes);
					mod.send('S_USER_EXTERNAL_CHANGE', 6, e);	// breaks any costume mods clothing, but atleast applies preset
				}
				return true;
			} else {
				return false;
			}
		}
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
			mod.command.message(`Unable to apply this preset (${presetToString(preset.race, preset.gender)}) to ${jobToString(userLoginInfo.class)}!`);
		}
	}

	function deletePreset(param) {
		if (Number.isNaN(param) || (Number(param) <= 0) || (Number(param) > mod.settings.presets.length)) {
			mod.command.message('Invalid preset number!');
		} else {
			let num = (param == null ? mod.settings.characters[userLoginInfo.name] : Number(param));
			mod.settings.presets.splice(num - 1, 1);
			if (num == mod.settings.characters[userLoginInfo.name]) {		// if param was null, or param == current preset number - revert current character appearance
				applyPreset(0);
				mod.settings.characters[userLoginInfo.name] = 0;
				mod.command.message(`Preset ${num} deleted, appearance reverted to original.`);
			} else {
				mod.command.message(`Preset ${num} deleted.`);
			}
			for (let name in mod.settings.characters) {
				if (mod.settings.characters[name] > num) mod.settings.characters[name]--;
				if (mod.settings.characters[name] == num) mod.settings.characters[name] = 0;
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
				race: userLoginInfo.race,
				gender: userLoginInfo.gender,
				appearance: userLoginInfo.appearance.toString(),
				details: userLoginInfo.details.toString('hex')
			});
			mod.command.message(`Preset saved at number ${mod.settings.presets.length}.`);
		}
		else {
			mod.command.message('This preset is already saved.');
		}
	}

	function updateUserCostumes(event) {
		userCostumes = {
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
			mod.command.message('"surg new app|gender|race" - emulate an appearance/gender/race change, create new preset;');
		},
		$default() {
			mod.command.message('Invalid command!');
		},
	}, this);
}