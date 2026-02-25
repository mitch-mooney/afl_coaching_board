# Modifcations and improvements

* When creating an animation using multiple phases some of the paths are not being assigned to the correct phase when event is created. If more than 2 phases are created then the third phase just copies the second phase and editing one will edit both. It seems that only one path can be created and used per player, in reality players have one path per phase. This is a truely important feature of the application and must be thought through carefully. Please use plugins to help.

