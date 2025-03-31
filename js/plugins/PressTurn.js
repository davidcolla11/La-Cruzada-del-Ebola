
(function() {
    var PressTurn = {
        turnIcons: 0,
        maxIcons: 0
    };

    // Initialize Turn Icons at the start of battle
    var _BattleManager_startTurn = BattleManager.startTurn;
    BattleManager.startTurn = function() {
        PressTurn.maxIcons = $gameParty.battleMembers().length;
        PressTurn.turnIcons = PressTurn.maxIcons;
        _BattleManager_startTurn.call(this);
    };

    // Force immediate action execution after selection
    var _Scene_Battle_onSelectAction = Scene_Battle.prototype.onSelectAction;
    Scene_Battle.prototype.onSelectAction = function() {
        var action = BattleManager.inputtingAction();
        var actor = BattleManager.actor();
        
        if (action && actor) {
            actor.setAction(0, action);
            this.executeImmediateAction(actor);
        } else {
            this.selectNextCommand();
        }
    };

    Scene_Battle.prototype.executeImmediateAction = function(actor) {
        if (actor && actor.currentAction()) {
            BattleManager._subject = actor;
            BattleManager.processTurn();
            this._actorCommandWindow.close(); // Close command window after action
            this._skillWindow.hide(); // Hide skill window if open
            this._itemWindow.hide(); // Hide item window if open
        }
        if (PressTurn.turnIcons > 0 && actor.canInput()) {
            this.selectNextCommand();
        } else {
            BattleManager.endTurn();
        }
    };

    // Modify turn consumption based on action results
    var _Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function(target) {
        _Game_Action_apply.call(this, target);
        
        if (this.subject().isActor()) { // Only apply for player actions
            var result = target.result();
            if (result.critical || this.isWeakHit(target)) {
                PressTurn.turnIcons = Math.max(PressTurn.turnIcons - 0.5, 0);
            } else if (result.missed || result.evaded || this.isResistHit(target)) {
                PressTurn.turnIcons = Math.max(PressTurn.turnIcons - 2, 0);
            } else {
                PressTurn.turnIcons = Math.max(PressTurn.turnIcons - 1, 0);
            }
            
            if (PressTurn.turnIcons <= 0) {
                BattleManager.endTurn();
            }
        }
    };

    // Ensure skills and attacks apply damage properly
    Game_Action.prototype.isWeakHit = function(target) {
        return target.traits(Game_BattlerBase.TRAIT_ELEMENT_RATE).some(trait => trait.dataId === this.item().damage.elementId && trait.value > 1);
    };
    
    Game_Action.prototype.isResistHit = function(target) {
        return target.traits(Game_BattlerBase.TRAIT_ELEMENT_RATE).some(trait => trait.dataId === this.item().damage.elementId && trait.value <= 0);
    };

    // Display Turn Icons on screen
    var _Window_BattleStatus_drawItem = Window_BattleStatus.prototype.drawItem;
    Window_BattleStatus.prototype.drawItem = function(index) {
        _Window_BattleStatus_drawItem.call(this, index);
        var rect = this.itemRect(index);
        this.drawText("Turns: " + PressTurn.turnIcons, rect.x, rect.y, rect.width, 'right');
    };
})();
