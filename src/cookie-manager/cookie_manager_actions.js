﻿cls.CookieManager.create_ui_widgets = function(viewid)
{
  window.eventHandlers.dblclick['cookiemanager-init-edit-mode'] = function(event, target)
  {
    this.broker.dispatch_action(viewid, "enter-edit-mode", event, target);
  }

  window.eventHandlers.click['cookiemanager-row-select'] = function(event, target)
  {
    this.broker.dispatch_action(viewid, "select-row", event, target);
  }

  window.eventHandlers.click['cookiemanager-container'] = function(event, target)
  {
    this.broker.dispatch_action(viewid, "check-to-exit-edit-mode", event, target);
  }

  window.eventHandlers.click['cookiemanager-add-cookie-row'] = function(event, target)
  {
    this.broker.dispatch_action(viewid, "add-cookie", event, target);
  }

  window.eventHandlers.click['cookiemanager-input-field'] = function(event, target)
  {
    // Empty for now, but preventing click['cookiemanager-container']
    // which exits editing
  }
}
