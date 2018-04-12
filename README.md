

## Surgeon  
A tera-proxy module that is able to change your character's appearance (race, gender, face slider and voice).  

## Difference to the original
* Includes Snugglez's [relog](https://github.com/Snugglez/relog) module by default. Please delete any relog modules you installed in tera-proxy. You can ignore the missing opcodes unless you moved/deleted your characters then use the relog module.
* Cleaned-up codes.
* Can apply and dynamically change different presets to different characters whereas the original one caused inconveniences, and has buggy side effects in certain circumstances.
* Removed aesthetic abnormalities and shape changers such as darkan and lachelith because Arborean Apparel.
* Using race/appearance/gender voucher emulation now requires you to be in Celestial Arena.
* Spawn the preview character clientside the first time "surgeon load [x]" command is used.
* Includes a anti-crash that makes incompatible classes (such as Baraka gunner, Male Aman brawler, and Popori ninja) reverted into compatible class (FeCast gunner, Female human brawler, Elin Ninja).
  
## Usage  
Automatically loads your character(s) new look whenever you start the game.
  
While in game, open a proxy chat session by typing "/proxy" or "/8" in chat and hitting the space bar.  
This serves as the script's command interface.  
The following commands are supported:  

* relog [name] - Relogs the name specified. Do not touch anything until the module logs in for you
* relog [number] - Relog to the n-th character from your selection list.
* relog nx - relog to the next character in your list.
* surgeon load [x] - preview/load the preset with the number x
* surgeon race - emulates a race change. Can only be used while in Celestial Arena.
* surgeon gender - emulates a gender change. Can only be used while in Celestial Arena.
* surgeon face - emulates an appearance change.
* surgeon new race - emulates a race change; creates new preset.
* surgeon new gender - emulates a gender change; creates new preset.
* surgeon new face - emulates an appearance change; creates new preset.
* surgeon voice [0-5] - changes your voice pitch, e.g. "surgeon voice 1"
  
Any other input, starting with "surgeon", will return a summary of above commands in the chat.  
  
## Safety
All operation from this module are clientside, meaning **only you** can see the effects.
  
