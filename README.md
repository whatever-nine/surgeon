
NOTICE: Not working in Male Human Brawler patch. Please wait until the proxy devs revised the required packets.

## Surgeon  
A tera-proxy module that is able to change your character's appearance (race, gender, face slider and voice).  

## Difference to the original
* Cleaned-up codes.
* Can apply different presets to different characters whereas the original one caused inconveniences, and has buggy side effects in certain circumstances.
* Replaced the outdated relog with safer lobby command.
* Removed aesthetic abnormalities and shape changers such as darkan and lachelith because they are unnesesary for the moment.
* Using race/appearance/gender voucher emulation now requires you to be in Celestial Arena.
* Spawn the preview character clientside the first time "Load" command is used.
* Includes a anti-crash that makes incompatible classes (such as Baraka gunner, Male Aman brawler, and Popori ninja) reverted into compatible class (FeCast gunner, Female human brawler, Elin Ninja).
  
## Usage  
Automatically loads your character(s) new look whenever you start the game.
  
While in game, open a proxy chat session by typing "/proxy" or "/8" in chat and hitting the space bar.  
This serves as the script's command interface.  
The following commands are supported:  
  
* surgeon load [x] - preview/load the preset with the number x
* surgeon race - emulates a race change. Can only be used while in Celestial Arena.
* surgeon gender - emulates a gender change. Can only be used while in Celestial Arena.
* surgeon appearance - emulates an appearance change. Can only be used while in Celestial Arena.
* surgeon new race - emulates a race change; creates new preset. Can only be used while in Celestial Arena.
* surgeon new gender - emulates a gender change; creates new preset. Can only be used while in Celestial Arena.
* surgeon new appearance - emulates an appearance change; creates new preset. Can only be used while in Celestial Arena.
* surgeon voice [0-5] - changes your voice pitch, e.g. "surgeon voice 1"
  
Any other input, starting with "surgeon", will return a summary of above commands in the chat.  
  
## Safety
All operation from this module (except logout to lobby) are clientside, meaning **only you** can see the effects.
  
