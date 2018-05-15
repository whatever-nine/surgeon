const path = require('path'),
	fs = require('fs'),
    Command = require('command')
		
module.exports = function Surgeon(dispatch) {
	const command = Command(dispatch)
	    
	let userlogininfo = null,
		usercostumes = {},
		inSurgeonRoom = false,
		newpreset = false,
		stack = -1,
		positions = {},
		curr_char = -1,
		marrow = false
        
    let customApp = {}
    
    try {
		customApp = require('./presets.json')
	}
	catch(e) {
		try {
			customApp = require('./app.json')
			fs.renameSync(path.join(__dirname, 'app.json'), path.join(__dirname, 'presets.json'))
		}
		catch(e) { customApp = {} }
	}

	// ############# //
	// ### Magic ### //
	// ############# //
		
	dispatch.hook('S_LOGIN', 10, event => {
		userlogininfo = Object.assign({}, event)
		Object.assign(userlogininfo, {
			race: Math.floor((event.templateId - 10101) / 200),
			gender: Math.floor((event.templateId - 10101) / 100) % 2,
			class: (event.templateId % 100) - 1,
			surgeon_race: Math.floor((event.templateId - 10101) / 200),
			surgeon_gender: Math.floor((event.templateId - 10101) / 100) % 2,
			surgeon_app: userlogininfo.appearance,
			surgeon_details: userlogininfo.details,
			surgeon_details2: userlogininfo.shape
		})
		inSurgeonRoom = false
		newpreset = false
		marrow = false
		UpdateUserCostumes(event)
		checkMeincustomApp(userlogininfo.name)
        if(customApp.characters[userlogininfo.name]){
			let currpreset = customApp.presets[customApp.characters[userlogininfo.name] - 1]
			let fix = fixModel(currpreset.race, currpreset.gender, userlogininfo.class)
            event.appearance = currpreset.app
            event.templateId = fix[3]
			event.details = getBuffer(currpreset.details)
			Object.assign(userlogininfo, {
				surgeon_race: fix[0],
				surgeon_gender: fix[1],
				surgeon_app: currpreset.app,
				surgeon_details: getBuffer(currpreset.details)
				// surgeon_details2: getBuffer(currpreset.shape)
			})
        }
		
		if(customApp.characters[userlogininfo.name]) return true;
	})

	dispatch.hook('S_USER_EXTERNAL_CHANGE', 6, {filter: {fake: null}}, event => {
		if (event.gameId.equals(userlogininfo.gameId)) UpdateUserCostumes(event)
 	})
	
	// Marrow fix
	dispatch.hook('S_UNICAST_TRANSFORM_DATA', 3, { order: -1 }, event => {
		if(event.gameId.equals(userlogininfo.gameId) && customApp.characters[userlogininfo.name]){
			marrow = (event.unk1 ? true : false)
			ChangeAppearance(customApp.characters[userlogininfo.name] - 1, marrow)
			return false
		}
 	})
	
	// Ragnarok Fix
	// dispatch.hook('S_ABNORMALITY_BEGIN', 2, { order: -1 }, (event) => {
		// if(event.target+'' === userlogininfo.gameId+'' && customApp.characters[userlogininfo.name] && event.id == 10155130) {
			// ChangeAppearance(customApp.characters[userlogininfo.name] - 1, marrow)
		// }
	// })
	
	// Ragnarok Fix
	// dispatch.hook('S_ABNORMALITY_END', 1, { order: -1 }, (event) =>{
		// if(event.target+'' === userlogininfo.gameId+'' && customApp.characters[userlogininfo.name] && event.id == 10155130) {
			// ChangeAppearance(customApp.characters[userlogininfo.name] - 1, marrow)
		// }
	// })
	
	//order is -1 for costume-ex/AA compatibility
	dispatch.hook('S_GET_USER_LIST', 14, { order: -1 }, (event) => {
        for (let indexx in event.characters) {
			let charname = event.characters[indexx].name
			checkMeincustomApp(charname)
			if(customApp.characters[charname]){
				let currpreset = customApp.presets[customApp.characters[charname] - 1]
				let fix = fixModel(currpreset.race, currpreset.gender, event.characters[indexx].job)
				event.characters[indexx].race = fix[0]
				event.characters[indexx].gender = fix[1]
				event.characters[indexx].appearance = currpreset.app
				event.characters[indexx].details = getBuffer(currpreset.details)
			}
		}
		return true
    })
	
	dispatch.hook('C_CANCEL_CHANGE_USER_APPEARANCE', 1, event => {
		if(inSurgeonRoom) {
			inSurgeonRoom = false
			dispatch.toClient('S_END_CHANGE_USER_APPEARANCE', 1, {
				ok: 0,
				unk: 0
			})
			relogByName(userlogininfo.name)
			return false
		}
	})
	
	dispatch.hook('C_COMMIT_CHANGE_USER_APPEARANCE', 1, event => {
		if(inSurgeonRoom) {
			inSurgeonRoom = false
			dispatch.toClient('S_END_CHANGE_USER_APPEARANCE', 1, {
				ok: 1,
				unk: 0
			})
			if (newpreset || customApp.characters[userlogininfo.name] == 0) {
				newpreset = false
				customApp.presets.push({
					race: event.race,
					gender: event.gender,
					app: event.appearance,
					details: event.details.toString('hex')
				})
				customApp.characters[userlogininfo.name] = customApp.presets.length
			} else {
				customApp.presets[customApp.characters[userlogininfo.name] - 1].race = event.race
				customApp.presets[customApp.characters[userlogininfo.name] - 1].gender = event.gender
				customApp.presets[customApp.characters[userlogininfo.name] - 1].app = event.appearance
				customApp.presets[customApp.characters[userlogininfo.name] - 1].details = event.details.toString('hex')
			}
            saveCustom(); relogByName(userlogininfo.name)
			return false
		}
	})
	
	// ######################## //
	// ### Helper Functions ### //
	// ######################## //
	
	function getBuffer(a) {
		let retbuffer = 0
		if (a && a.data) {
			retbuffer = Buffer.from(a.data)
		} else if (a && typeof a === 'string') {
			retbuffer = Buffer.from(a, 'hex')
		}
		return retbuffer
	}
	
	function SurgeonRoom(room, itemid) {
		if(room == 2 && (userlogininfo.surgeon_race == 4 || userlogininfo.surgeon_race == 5)) {
			command.message('Popori, Elin and Baraka are ineligible for gender change')
			return
		}
		inSurgeonRoom = true
		dispatch.toClient('S_START_CHANGE_USER_APPEARANCE', 2, {
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
			appearance: (room == 3 ? userlogininfo.surgeon_app : 0),
			weaponEnchantment: userlogininfo.weaponEnchant, // enchantment
			item: itemid,
			details: userlogininfo.surgeon_details,
			details2: userlogininfo.surgeon_details2
		})
	}
	
	/* If you have this opcode mapped... It should work, I guess
	function voiceChange(voicelevel) {
		if(voicelevel < 0 || voicelevel > 5) {
			command.message('Please choose a voice id between 0 and 5')
			return
		} else {
			if(logingender == 1 && voicelevel == 5) voicelevel = 4 // females have 1 voice less
			dispatch.toClient('S_CHANGE_VOICE_USE_QAC', 1, {
				voice: voicelevel
			})
		}
	}
	*/
	
	function checkMeincustomApp(p) {
		if (!customApp.characters || !customApp.presets) { //init customApp value
			customApp = {
				characters: {},
				presets: []
			}
		}
		if (!customApp.characters[p]) customApp.characters[p] = 0
		if (customApp.characters[p] > customApp.presets.length) customApp.characters[p] = 0
	}
	
	function fixModel(race, gender, job) {
		let cmodel = 10101 + (race * 200) + job
		cmodel += (gender == 1 ? 100 : 0)
		let correction = [race,gender,job,cmodel]
		switch (job) {  // 101/102 Human, 103/104 High Elf, 105/106 Aman, 107/108 Castanic, 109/110 Popori/Elin, 111 Baraka
			case 8: //reaper
				if (cmodel != 11009) correction = [4,1,8,11009]
				break
			case 9: //gunner
				if (cmodel != 10410 && cmodel != 10810 && cmodel != 11010) correction = [3,1,9,10810]
				break
			case 10: //brawler
				if (cmodel != 10111 && cmodel != 10211) correction = [0,0,10,10111]
				break
			case 11: //ninja
				if (cmodel != 11012) correction = [4,1,11,11012]
				break
			case 12: //Valkyrie
				if (cmodel != 10813) correction = [3,1,12,10813]
				break
		}
		return correction
	}

	function UpdateUserCostumes(event){
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
			} = event
	}

	function ChangeAppearance(index, marrow){
		if (index < 0) {
			let fix = fixModel(userlogininfo.race, userlogininfo.gender, userlogininfo.class)
			let e = {
				serverId: userlogininfo.serverId,
				playerId: userlogininfo.playerId,
				gameId: userlogininfo.gameId,
				type: 1,
				unk1: marrow,
				unk2: true,
				templateId: fix[3],
				appearance: userlogininfo.appearance,
				appearance2: 100,	
				details: userlogininfo.details,
				shape: userlogininfo.shape
			}
			Object.assign(e, usercostumes)
			Object.assign(userlogininfo, {
				surgeon_race: userlogininfo.race,
				surgeon_gender: userlogininfo.gender,
				surgeon_app: userlogininfo.appearance,
				surgeon_details: userlogininfo.details
			})
			dispatch.toClient('S_UNICAST_TRANSFORM_DATA', 3, e)
		} else {
			let currpreset = customApp.presets[index]
			let fix = fixModel(currpreset.race, currpreset.gender, userlogininfo.class)
			let e = {
				serverId: userlogininfo.serverId,
				playerId: userlogininfo.playerId,
				gameId: userlogininfo.gameId,
				type: 1,
				unk1: marrow,
				unk2: true,
				templateId: fix[3],
				appearance: currpreset.app,
				appearance2: 100,	
				details: getBuffer(currpreset.details)
			}
			Object.assign(e, usercostumes)
			Object.assign(userlogininfo, {
				surgeon_race: fix[0],
				surgeon_gender: fix[1],
				surgeon_app: currpreset.appearance,
				surgeon_details: getBuffer(currpreset.details)
			})
			dispatch.toClient('S_UNICAST_TRANSFORM_DATA', 3, e)
		}
	}

	
	// ################# //
	// ### Chat Hook ### //
	// ################# //
	
	command.add('relog', (name) => {
		if (!name) relogByName(userlogininfo.name)	// works, but resets any AA dressing
		else relogByName(name)
	})
	
	command.add('surgeon', (param, number, num2) => {
		switch (param) {
		case 'load':
				stack = (number == null ? 0 : Number(number))
				if(stack <= 0){
					customApp.characters[userlogininfo.name] = 0
					ChangeAppearance(-1, marrow)
					saveCustom()
					command.message('[Surgeon] Appearance reverted.')
				} else if (stack > customApp.presets.length) {
					command.message('[Surgeon] Invalid Preset. Does not exist.')
				} else {
					customApp.characters[userlogininfo.name] = stack
					ChangeAppearance(stack - 1, marrow)
					saveCustom()
					command.message('[Surgeon] Using preset ' + stack)
				}
				break
		case 'race': newpreset = false; SurgeonRoom(1, 168011); break
		case 'gender': newpreset = false; SurgeonRoom(2, 168012); break
		case 'face': newpreset = false; SurgeonRoom(3, 168013); break
		case 'new':
			newpreset = true
			switch (number) {
				case 'race': SurgeonRoom(1, 168011); break
				case 'gender': SurgeonRoom(2, 168012); break
				case 'face': SurgeonRoom(3, 168013); break
			}
			break
		case 'voice': voiceChange((number == null ? 0 : Number(number))); break
		default:
			command.message('[Surgeon] Commands:<br>'
								+ ' "surgeon load [x]" - load your saved preset slot x, 0 - revert to original,<br>'
								+ ' "surgeon race" - emulates a race change,<br>'
								+ ' "surgeon gender" - emulates a gender change,<br>'
								+ ' "surgeon face" - emulates an appearance change; edits current preset, or creates new one if used with your "true" appearance,<br>'
								+ ' "surgeon new race" - emulates a race change; creates new preset,<br>'
								+ ' "surgeon new gender" - emulates a gender change; creates new preset,<br>'
								+ ' "surgeon new face" - emulates an appearance change; creates new preset<br>'
			)
		}
	})
	
	function saveCustom() {
		fs.writeFileSync(path.join(__dirname, 'presets.json'), JSON.stringify(customApp, null, '\t'))
	}
	
	// ################# //
	// ### Relog     ### //
	// ################# //
	
	function relogByName(name) {
		if (!name) return
		getCharacterId(name)
		  .then(relog)
		  .catch(e => console.error(e.message))
	}
	
  // Grab the user list the first time the client sees the lobby
  dispatch.hookOnce('S_GET_USER_LIST', 14, event => updatePositions(event.characters))

  // dispatch.hook('C_DELETE_USER', 'raw', () =>
    // dispatch.hookOnce('S_GET_USER_LIST', 12, event => updatePositions(event.characters))
  // )

  // Update positions on reorder
  // dispatch.hook('C_CHANGE_USER_LOBBY_SLOT_ID', 1, event => {
    // updatePositions(event.characters)
  // })

  // Keep track of current char for relog nx
  dispatch.hook('C_SELECT_USER', 1, /*{order: 100, filter: {fake: null}},*/ event => {
    curr_char = positions[event.id]
  })

  function updatePositions(characters) {
    if (!characters) return
    positions = {}
    characters.forEach((char, i) => {
      let {id, position} = char
      positions[id] = position || (i+1)
    })
  }

  function getCharacterId(name) {
    return new Promise((resolve, reject) => {
      // request handler, resolves with character's playerId
      const userListHook = dispatch.hookOnce('S_GET_USER_LIST', 14, event => {
        name = name.toLowerCase()
        let index = (name === 'nx')? ++curr_char : parseInt(name)
        if (index && index > event.characters.length) index = 1
        event.characters.forEach((char, i) => {
          if (char.deletion) return
          let pos = char.position || (i+1)
          if (char.name.toLowerCase() === name || pos === index) resolve(char.id)
        })
        reject(new Error(`[relog] character "${name}" not found`))
      })

      // set a timeout for the request, in case something went wrong
      setTimeout(() => {
        if (userListHook) dispatch.unhook(userListHook)
        reject(new Error('[relog] C_GET_USER_LIST request timed out'))
      }, 5000)

      // request the character list
      dispatch.toServer('C_GET_USER_LIST', 1, {})
    })
  }

  function relog(targetId) {
    if (!targetId) return
    dispatch.toServer('C_RETURN_TO_LOBBY', 1, {})
    let userListHook
    let lobbyHook

    // make sure that the client is able to log out
    const prepareLobbyHook = dispatch.hookOnce('S_PREPARE_RETURN_TO_LOBBY', 1, () => {
      dispatch.toClient('S_RETURN_TO_LOBBY', 1, {})

      // the server is not ready yet, displaying "Loading..." as char names
      userListHook = dispatch.hookOnce('S_GET_USER_LIST', 14, event => {
        event.characters.forEach(char => char.name = 'Loading...')
        return true
      })

      // the server is ready to relog to a new character
      lobbyHook = dispatch.hookOnce('S_RETURN_TO_LOBBY', 1, () => {
        process.nextTick (() => dispatch.toServer('C_SELECT_USER', 1, { id: targetId, unk: 0 }))
      })
    })

    // hook timeout, in case something goes wrong
    setTimeout(() => {
      for (const hook of [prepareLobbyHook, lobbyHook, userListHook])
        if (hook) dispatch.unhook(hook)
    }, 15000)
  }
	
}
