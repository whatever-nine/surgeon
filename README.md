## Surgeon  
A tera-proxy module that is able to change your character's appearance (race, gender, face slider and voice).  

### Difference to the original
* Includes Snugglez's [relog](https://github.com/Snugglez/relog) module by default. Please delete any relog modules you installed in tera-proxy. You can ignore the missing opcodes unless you moved/deleted your characters then use the relog command which can cause unexpected behavior.
* Cleaned-up codes.
* Can apply and dynamically change different presets to different characters without relogging, whereas the original one caused inconveniences, and has buggy side effects in certain circumstances.
* Removed aesthetic abnormalities and shape changers such as darkan and lachelith because Arborean Apparel.
* Includes an anti-crash that makes incompatible classes (such as Baraka gunner, Male Aman brawler, and Popori ninja) reverted into compatible class (FeCast gunner, Female human brawler, Elin Ninja).
* Fixed Marrow Brooch glitch which it can revert the appearance back to normal.
* Added auto-update compatibility with [Caali](https://github.com/hackerman-caali)'s tera-proxy.
  
### Usage  
Automatically loads your character(s) new look whenever you start the game.
  
While in game, open a proxy chat session by typing `/proxy` or `/8` in chat and hitting the space bar.  
This serves as the script's command interface.  
The following commands are supported:  

* `surgeon load [x]` - preview/load the preset with the number **x**.
* `surgeon race` - emulates a race change. Can only be used while in Celestial Arena.
* `surgeon gender` - emulates a gender change. Can only be used while in Celestial Arena.
* `surgeon face` - emulates an appearance change; edits current preset, or creates new one if used with your "true" appearance.
* `surgeon new race` - emulates a race change; creates new preset.
* `surgeon new gender` - emulates a gender change; creates new preset.
* `surgeon new face` - emulates an appearance change; creates new preset.
  
Any other input, starting with `surgeon`, will return a summary of above commands in the chat.  
  
### Safety
All operation from this module are clientside, meaning **only you** can see the effects.
Note that race change **will** desync you when using skills unless racial skill movement between old and new races is extremely similar (ie. sorc, gunner). (c) [Pinkie Pie](https://github.com/pinkipi)

### Known issues
* Poor compatibility with dress-up modules (tested with Arborean Apparel) - changing appearance resets AA preset for current character as like as relogging using a `relog` command (that's why I did not add it to commands list).
* After changing preset in-game by `surgeon load` command your character window completely breaks - you can't equip/unequip **any** piece of equipment or costume until relog (it also breaks AA - you can edit your preset, but your character's look will remain the same). You can use `relog` command, but see above. So, manual relog is the best solution.