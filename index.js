const path = require('path'),
	fs = require('fs'),
    Command = require('command')

const CELESTIAL_ARENA_ID = 9830
		
module.exports = function Surgeon(dispatch) {
	const command = Command(dispatch)
	    
	let guid = null,
		player = '',
		templateId = -1,
		previewspawn = -1,
		logininfo = null,
		loginrace = -1,
		logingender = -1,
		loginjob = -1,
		inSurgeonRoom = false,
		newpreset = false,
		shapeid = -1,
		stack = -1,
		zone = 0,
		px,
		pw,
		py,
		pz
        
    let customApp = {}
    
    try {
		customApp = require('./app.json')
	}
	catch(e) { customApp = {} }

	// ############# //
	// ### Magic ### //
	// ############# //
		
	dispatch.hook('S_LOGIN', 7, event => {
		player = event.name
		loginjob = event.templateId % 100 - 1
		checkMeincustomApp(player)
        if(customApp.characters[player]){
			let currpreset = customApp.presets[customApp.characters[player] - 1]
			let fix = fixModel(currpreset.race, currpreset.gender, loginjob)
            event.appearance = currpreset.app
            event.templateId = fix[3]
			event.details = getBuffer(currpreset.details.data)
        }
		({guid, templateId} = event)
		logininfo = event
		loginrace = Math.floor((templateId - 10101) / 200) // 0 Human, 1 High Elf, 2 Aman, 3 Castanic, 4 Popori/Elin, 5 Baraka
		logingender = Math.floor((templateId - 10101) / 100) % 2 // 0 male, 1 female
		inSurgeonRoom = false
		previewspawn = -1
		newpreset = false
		zone = 0
        
        if(customApp.characters[player] != -1) return true;
	})
	
	//order is -1 for costume-ex compatibility
	dispatch.hook('S_GET_USER_LIST', 11, { order: -1 }, (event) => {
        for (let indexx in event.characters) {
			let charname = event.characters[indexx].name
			checkMeincustomApp(charname)
			if(customApp.characters[charname]){
				let currpreset = customApp.presets[customApp.characters[charname] - 1]
				let fix = fixModel(currpreset.race, currpreset.gender, event.characters[indexx].job)
				event.characters[indexx].race = fix[0]
				event.characters[indexx].gender = fix[1]
				event.characters[indexx].appearance = currpreset.app
				event.characters[indexx].details = getBuffer(currpreset.details.data)
			}
		}
		return true
    })

	dispatch.hook('S_LOAD_TOPO', 2, event =>{
		previewspawn = -1
		zone = event.zone
	});
	
	dispatch.hook('C_CANCEL_CHANGE_USER_APPEARANCE', 1, event => {
		if(inSurgeonRoom) {
			inSurgeonRoom = false
			dispatch.toClient('S_END_CHANGE_USER_APPEARANCE', 1, {
				ok: 0,
				unk: 0
			})
			ToLobby()
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
			if (newpreset || customApp.characters[player] == 0) {
				newpreset = false
				customApp.presets.push({
					race: event.race,
					gender: event.gender,
					app: event.appearance,
					details: strBuffer(event.details)
				})
				customApp.characters[player] = customApp.presets.length
			} else {
				customApp.presets[customApp.characters[player] - 1].race = event.race
				customApp.presets[customApp.characters[player] - 1].gender = event.gender
				customApp.presets[customApp.characters[player] - 1].app = event.appearance
				customApp.presets[customApp.characters[player] - 1].details = strBuffer(event.details)
			}
            saveCustom();
            
			ToLobby()
			return false
		}
	})
	
	dispatch.hook('C_PLAYER_LOCATION', 1, event =>{
		pw = event.w;
		px = event.x1;
		py = event.y1;
		pz = event.z1;
	});
	
	// ######################## //
	// ### Helper Functions ### //
	// ######################## //
	
	function getBuffer(a) {
		let retbuffer = 0
		if (a && Array.isArray(a)) {
			retbuffer = Buffer.from(a)
		}
		return retbuffer
	}
	
	function strBuffer(bf) {
		let bfstr = JSON.stringify(bf)
		let retobj = JSON.parse(bfstr)
		return retobj
	}
	
	function SurgeonRoom(room, itemid) {
		if(zone != CELESTIAL_ARENA_ID) {
			command.message('Please use this command in Celestial Arena to reduce the risk of crashing')
			return
		}
		if(room == 2 && (loginrace == 4 || loginrace == 5)) {
			command.message('Popori, Elin and Baraka are ineligible for gender change')
			return
		}
		inSurgeonRoom = true
		dispatch.toClient('S_START_CHANGE_USER_APPEARANCE', 2, {
			type: room,
			playerId: logininfo.playerId,
			gender: logingender,
			race: loginrace,
			class: loginjob,
			weapon: logininfo.weapon,
			earring1: 0,
			earring2: 0,
			chest: logininfo.chest,
			gloves: logininfo.gloves,
			boots: logininfo.boots,
			unk0: 0,
			ring1: 0,
			ring2: 0,
			innerwear: logininfo.innerwear,
			appearance: (room == 3 ? logininfo.appearance : 0),
			unk1: 0,
			unk2: 0,
			unk3: 0,
			unk4: 0,
			unk5: 0,
			unk6: 0,
			unk7: 0,
			unk8: 0,
			unk9: 0,
			unk10: 0,
			unk11: 0,
			unk12: 0,
			unk13: 0,
			unk14: 0,
			unk15: 0,
			unk16: 0,
			unk17: 0,
			unk18: 0,
			unk19: 0,
			unk20: 0,
			unk21: 0,
			unk22: 0,
			unk23: 0,
			weaponEnchantment: logininfo.weaponEnchantment, // enchantment
			unk25: 100,
			item: itemid,
			details: logininfo.details,
			details2: logininfo.details2
		})
	}
	
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
		let cmodel = 10101 + (race * 200) + (gender * 100) + job
		let correction = [race,gender,job,cmodel]
		switch (job) {  // 0 Human, 1 High Elf, 2 Aman, 3 Castanic, 4 Popori/Elin, 5 Baraka
			case 8: //reaper
				if (cmodel != 11009) correction = [4,1,8,11009]
				break
			case 9: //gunner
				if (cmodel != 10410 || cmodel != 10810 || cmodel != 11010) correction = [3,1,9,10810]
				break
			case 10: //brawler
				if (cmodel != 10211) correction = [0,1,10,10211]
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
	
	function DespawnPreview() {
		dispatch.toClient('S_DESPAWN_USER', 3, {
			gameId: 66666666666666,
			type: 1	
		})
		previewspawn = -1
	}

	function PreviewAppearance(index){
		let currpreset = customApp.presets[index]
		let fix = fixModel(currpreset.race, currpreset.gender, loginjob)
		if (previewspawn > -1) DespawnPreview()
		dispatch.toClient('S_SPAWN_USER', 11, {
			serverId: logininfo.serverId,
			playerId: logininfo.playerId,
			gameId: 66666666666666,
			x: px,
			y: py,
			z: pz,
			w: pw,
			relation: 1,
			templateId: fix[3],
			visible: 1,
			alive: 1,
			appearance: logininfo.appearance,
			spawnFx: 0,
			pose: 7,
			body: logininfo.body,
			hand: logininfo.hand,
			feet: logininfo.feet,
			weapon: logininfo.weapon,
			underwear: logininfo.underwear,
			weaponEnchant: logininfo.weaponEnchant,
			showFace: logininfo.showFace,
			showStyle: 0,
			name: 'Surgeon Preset '+(index+1)+'',
			details: getBuffer(currpreset.details.data)
		})
		previewspawn = index
	}
	
	// ################# //
	// ### Chat Hook ### //
	// ################# //
	
	
	command.add('surgeon', (param, number, num2) => {
		switch (param) {
		case 'load':
				stack = (number == null ? 0 : Number(number))
				if(stack <= 0){
					customApp.characters[player] = 0
					saveCustom()
					command.message('Settings reverted. Please relog to unload the custom appearance.')
				} else if (stack > customApp.presets.length) {
					command.message('Invalid Preset. Does not exist.')
				} else {
					if (previewspawn !== stack) {
						PreviewAppearance(stack - 1)
						command.message('Previewing the preset. Please use the same command again to confirm.')
					} else {
						customApp.characters[player] = stack
						saveCustom()
						command.message('Settings changed. Please relog to load the custom appearance.')
					}
				}
				break
		case 'race': newpreset = false; SurgeonRoom(1, 168011); break
		case 'gender': newpreset = false; SurgeonRoom(2, 168012); break
		case 'appearance': newpreset = false; SurgeonRoom(3, 168013); break
		case 'new':
			newpreset = true
			switch (number) {
				case 'race': SurgeonRoom(1, 168011); break
				case 'gender': SurgeonRoom(2, 168012); break
				case 'appearance': SurgeonRoom(3, 168013); break
			}
			break
		case 'voice': voiceChange((number == null ? 0 : Number(number))); break
		default:
			command.message('Commands:<br>'
								+ ' "surgeon load [x]" (preview/load your saved preset slot x, 0 = disable"),<br>'
								+ ' "surgeon race" (emulates a race change),<br>'
								+ ' "surgeon gender" (emulates a gender change),<br>'
								+ ' "surgeon face" (emulates an appearance change),<br>'
								+ ' "surgeon new race" (emulates a race change; creates new preset),<br>'
								+ ' "surgeon new gender" (emulates a gender change; creates new preset),<br>'
								+ ' "surgeon new face" (emulates an appearance change; creates new preset),<br>'
								+ ' "surgeon voice [0-5]" (changes your voice pitch),<br>'
			)
		}
	})
	
	function saveCustom() {
		fs.writeFileSync(path.join(__dirname, 'app.json'), JSON.stringify(customApp))
	}
	
	//just return to lobby...
	
	function ToLobby() {
		dispatch.toServer('C_RETURN_TO_LOBBY', 1, {});
	}
	
}
