﻿window.cls || (window.cls = {});
cls.EcmascriptDebugger || (cls.EcmascriptDebugger = {});
cls.EcmascriptDebugger["5.0"] || (cls.EcmascriptDebugger["5.0"] = {});
cls.EcmascriptDebugger["6.0"] || (cls.EcmascriptDebugger["6.0"] = {});

/**
  * @constructor
  */

cls.EcmascriptDebugger["6.0"].StopAt =
cls.EcmascriptDebugger["5.0"].StopAt = function()
{

  /**
  * two layers are needed.
  * stop_at script must be enabled allways to be able to reasign breakpoints.
  */

  var stop_at_settings =
  {
    script: 1,
    exception: 0,
    error: 0,
    abort: 0,
    gc: 0,
    debugger_statement: 1
  }

  // replace with settings['js-source'].get(key)
  var stop_at_user_settings =
  {
    script: 0,
    exception: 0,
    error: 0,
    abort: 0,
    gc: 0,
    debugger_statement: 1
  }

  var stop_at_id_map =
  {
    script: 0,
    exception: 1,
    error: 2,
    abort: 3,
    gc: 4,
    debugger_statement: 5
  }

  var self = this;

  var ecma_debugger = window.services['ecmascript-debugger'];

  var stopAt = {}; // there can be only one stop at at the time

  var runtime_id = '';

  var callstack = [];

  var __controls_enabled = false;

  var __stopAtId = 1;

  var __selected_frame_index = -1;

  var cur_inspection_type = '';

  var getStopAtId = function()
  {
    return __stopAtId++;
  }

  var _is_initial_settings_set = false;

  this.getStopAts = function()
  {
    return stop_at_user_settings; // should be  copied
  }

  var onSettingChange = function(msg)
  {
    if(msg.id == 'js_source' )
    {
      var key = msg.key, value = settings['js_source'].get(key);
      if( key == 'script' )
      {

      }
      else
      {
        stop_at_settings[key] = value;
        var config_arr = [], prop = '';
        for ( prop in stop_at_settings )
        {
          config_arr[stop_at_id_map[prop]] = stop_at_settings[prop] && 1 || 0;
        }
        ecma_debugger.requestSetConfiguration(0, config_arr);
      }
    }
  }

  this.setUserStopAt = function(key, value)
  {
    //stop_at_user_settings[key] = value; // true or false;
    opera.postError(ui_strings.DRAGONFLY_INFO_MESSAGE +
      'clean up. this should no longer be called. stop_at.setUserStopAt');

  }

  this.getRuntimeId = function()
  {
    return runtime_id;
  }

  
  this.getControlsEnabled = function()
  {
    return __controls_enabled;
  }
  
  this.__defineGetter__("is_stopped", function()
  {
    return __controls_enabled;
  });
  
  this.__defineSetter__("is_stopped", function(){});

  this.getFrames = function()
  {
    return callstack; // should be copied
  }

  this.getFrame = function(id)
  {
    return callstack[id];
  }

  this.getThreadId = function()
  {
    return stopAt && stopAt.thread_id || '';
  }

  /**
    * To get the selected frame index.
    * It can return -1 which means that no frame is selected.
    * Be aware that -1 is not a valid value in e.g. the Eval command.
    * 0 for frame index has an overloaded meaning: if the thread id is not 0
    * it means the top frame, otherwise it means no frame.
    */
  this.getSelectedFrameIndex = function()
  {
    return __selected_frame_index;
  }

  /**
    * To get the selected frame.
    * @returns null or an object with runtime_id, scope_id, thread_id and index.
    */
  this.getSelectedFrame = function()
  {
    if (__selected_frame_index > -1)
    {
      var frame = callstack[__selected_frame_index];
      return (
      {
        runtime_id: frame.rt_id,
        scope_id: frame.scope_id,
        thread_id: stopAt.thread_id,
        index: __selected_frame_index,
        argument_id: frame.argument_id,
        scope_list: frame.scope_list
      });
    }
    return null;
  }

  var parseBacktrace = function(status, message, stop_at)
  {

    const
    FRAME_LIST = 0,
    // sub message BacktraceFrame
    FUNCTION_ID = 0,
    ARGUMENT_OBJECT = 1,
    VARIABLE_OBJECT = 2,
    THIS_OBJECT = 3,
    OBJECT_VALUE = 4,
    SCRIPT_ID = 5,
    LINE_NUMBER = 6,
    // sub message ObjectValue
    OBJECT_ID = 0,
    NAME = 5,
    SCOPE_LIST = 7;
    
    if (status)
    {
      opera.postError("parseBacktrace failed scope message: " + message);
    }
    else
    {
      var _frames = message[FRAME_LIST], frame = null, i = 0;
      var fn_name = '', line = '', script_id = '', argument_id = '', scope_id = '';
      var _frames_length = _frames.length;
      var is_all_frames = _frames_length <= ini.max_frames;
      callstack = [];
      for( ; frame  = _frames[i]; i++ )
      {
        callstack[i] =
        {
          fn_name : is_all_frames && i == _frames_length - 1
                    ? 'global scope'
                    : frame[OBJECT_VALUE][NAME] || 'anonymous',
          line : frame[LINE_NUMBER],
          script_id : frame[SCRIPT_ID],
          argument_id : frame[ARGUMENT_OBJECT],
          scope_id : frame[VARIABLE_OBJECT],
          this_id : frame[THIS_OBJECT],
          id: i,
          rt_id: stop_at.runtime_id,
          scope_list: frame[SCOPE_LIST]
        }
      }
      
      if( cur_inspection_type != 'frame' )
      {
        messages.post('active-inspection-type', {inspection_type: 'frame'});
      }
      messages.post('frame-selected', {frame_index: 0});
      views.callstack.update();
      if (!views.js_source.isvisible())
      {
        topCell.showView(views.js_source.id);
      }
      var top_frame = callstack[0];
      var plus_lines = views.js_source.getMaxLines() <= 10 ? 
                       views.js_source.getMaxLines() / 2 >> 0 :
                       10;
      if (views.js_source.showLine(top_frame.script_id, top_frame.line - plus_lines))
      {
        runtimes.setSelectedScript(top_frame.script_id);
        views.js_source.showLinePointer(top_frame.line, true);
      }
      toolbars.js_source.enableButtons('continue');
      messages.post('thread-stopped-event', {stop_at: stop_at});
      messages.post('host-state', {state: 'waiting'});
      setTimeout(function(){ __controls_enabled = true;}, 50);
    }
  }

  this.setInitialSettings = function()
  {
    if(!_is_initial_settings_set )
    {
      var config_arr = [], prop = '';
      for ( prop in stop_at_settings )
      {
        config_arr[stop_at_id_map[prop]] =
          ( ( stop_at_user_settings[prop] = settings['js_source'].get(prop) )
            || stop_at_settings[prop] ) && 1 || 0;
      }
      ecma_debugger.requestSetConfiguration(0, config_arr);
      _is_initial_settings_set = true;
    }
  }

  this.__continue = function (mode) //
  {
    var tag = tag_manager.set_callback(this, this._handle_continue, [mode]);
    var msg = [stopAt.runtime_id, stopAt.thread_id, mode];
    services['ecmascript-debugger'].requestContinueThread(tag, msg);
  }
  
  this.continue_thread = function (mode) //
  {
    if (this.is_stopped)
    {
      this.__continue(mode);
    }
  }
  
  this._handle_continue = function(status, message, mode)
  {
    __controls_enabled = false;
    callstack = [];
    runtimes.setObserve(stopAt.runtime_id, mode != 'run');
    messages.post('frame-selected', {frame_index: -1});
    messages.post('thread-continue-event', {stop_at: stopAt});
    toolbars.js_source.disableButtons('continue');
    messages.post('host-state', {state: 'ready'});
  }

  this.handle = function(message)
  {
    const
    RUNTIME_ID = 0,
    THREAD_ID = 1,
    SCRIPT_ID = 2,
    LINE_NUMBER = 3,
    STOPPED_REASON = 4,
    BREAKPOINT_ID = 5;


    stopAt =
    {
      runtime_id: message[RUNTIME_ID],
      thread_id: message[THREAD_ID],
      script_id: message[SCRIPT_ID],
      line_number: message[LINE_NUMBER],
      stopped_reason: message[STOPPED_REASON],
      breakpoint_id: message[BREAKPOINT_ID]
    };

    var line = stopAt.line_number;
    if( typeof line == 'number' )
    {
      /**
      * This event is enabled by default to reassign breakpoints.
      * Here it must be checked if the user likes actually to stop or not.
      * At the moment this is a hack because the stop reason is not set for that case.
      * The check is if the stop reason is 'unknown' ( should be 'new script')
      */
      if(stopAt.stopped_reason == 'unknown')
      {
        runtime_id = stopAt.runtime_id;
        if(  settings['js_source'].get('script')
             || runtimes.getObserve(runtime_id)
              // this is a workaround for Bug 328220
              // if there is a breakpoint at the first statement of a script
              // the event for stop at new script and the stop at breakpoint are the same
             || this._bps.script_has_breakpoint_on_line(stopAt.script_id, line))
        {
          if( runtimes.getSelectedRuntimeId() != runtime_id )
          {
            runtimes.setSelectedRuntimeId(runtime_id);
          }
          this._stop_in_script(stopAt);
        }
        else
        {
          this.__continue('run');
        }
      }
      else
      {
        /* 
          example

          "runtime_id":2,
          "thread_id":7,
          "script_id":3068,
          "line_number":8,
          "stopped_reason":"breakpoint",
          "breakpoint_id":1

        */
        var condition = this._bps.get_condition(stopAt.breakpoint_id);
        if (condition)
        {
          var tag = tagManager.set_callback(this, 
                                            this._handle_condition,
                                            [stopAt]);
          var msg = [stopAt.runtime_id, 
                     stopAt.thread_id, 
                     0, 
                     condition, 
                     [['dummy', 0]]];
          services['ecmascript-debugger'].requestEval(tag, msg);
        }
        else
        {
          this._stop_in_script(stopAt);
        }
      }
    }
    else
    {
      throw 'not a line number: '+stopAt.line_number;
    }
  }

  this._handle_condition = function(status, message, stop_at)
  {
    const STATUS = 0, TYPE = 1, VALUE = 2;
    if (status)
    {
      opera.postError('Evaling breakpoint condition failed');
      this.__continue('run');
    }
    else if(message[STATUS] == "completed" &&
            message[TYPE] == "boolean" && 
            message[VALUE] == "true")
    {
      this._stop_in_script(stop_at);
    }
    else
    {
      this.__continue('run');
    }
  }

  this._stop_in_script = function(stop_at)
  {
    var tag = tagManager.set_callback(null, parseBacktrace, [stop_at]);
    var msg = [stop_at.runtime_id, stop_at.thread_id, ini.max_frames];
    services['ecmascript-debugger'].requestGetBacktrace(tag, msg);
  }

  var onRuntimeDestroyed = function(msg)
  {
    if( stopAt && stopAt.runtime_id == msg.id )
    {
      views.callstack.clearView();
      views.inspection.clearView();
      self.__continue('run');
    }

  }

  messages.addListener('runtime-destroyed', onRuntimeDestroyed);

  var onActiveInspectionType = function(msg)
  {
    cur_inspection_type = msg.inspection_type;
  }

  var onFrameSelected = function(msg)
  {
    __selected_frame_index = msg.frame_index;
  }

  this._bps = cls.Breakpoints.get_instance();
  
  messages.addListener('active-inspection-type', onActiveInspectionType);



  messages.addListener('setting-changed', onSettingChange);
  messages.addListener('frame-selected', onFrameSelected);

  this.bind = function(ecma_debugger)
  {
    var self = this;

    ecma_debugger.handleSetConfiguration =
    ecma_debugger.handleContinueThread =
    function(status, message){};


    ecma_debugger.addListener('enable-success', function()
    {
      self.setInitialSettings();
    });
  }

  this._bps = window.cls.Breakpoints.get_instance();


}