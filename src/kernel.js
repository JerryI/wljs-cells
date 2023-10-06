
import { deflate } from 'pako';

function __emptyFalse(a) {
    if (a === '') return false;
    return a;
  }
  
  //CELL TYPES / LANGUAGES
  window.SupportedCells = {};
  window.SupportedLanguages = [];
  //GLobals
  window.Extensions = [];
  
  window.CellHashStorage = {};
  
  const CellHash = {
    add: (obj) => {
      CellHashStorage[obj.uid] = obj;
    },
  
    get: (uid) => {
      return CellHashStorage[uid];
    },
  
    remove: (uid) => {
      CellHashStorage[uid] = undefined;
    },
  
  }
  
  let CellList = {};
  
  core.CellHash = CellHash;
  core.CellList = CellList;

  let currentCell;

  if (window.electronAPI) {
    if (window.electronAPI.cellop) {
    window.electronAPI.cellop((event, id) => {
        console.log(id);
        if (server.socket.readyState != 1) alert('Connection to the server was lost!');

        if (id === 'HC') {
            
          currentCell.hideCell();           
        }

        if (id === 'HUC') {
          currentCell.hidePrev();       
        }    
        
        if (id === 'HLC') {
          currentCell.hideNext();       
        }
    });
  }
  }
  
  
  class CellWrapper {
    uid = ''
    parent = false
    prev = false
    type = "input"
    element = document.body
    state = 'idle'
  
    focusNext(startpoint) {
      console.log('next');
      const pos = CellList[this.sign].indexOf(this.uid);
      if (pos + 1 < CellList[this.sign].length) {
        CellHash.get(CellList[this.sign][pos + 1]).display?.editor?.focus();
      } else {
        this.addCellAfter();
      }
    }
  
    focusPrev(startpoint) {
      console.log('prev');
      const pos = CellList[this.sign].indexOf(this.uid);
      if (pos - 1 >= 0) {
        CellHash.get(CellList[this.sign][pos - 1]).display?.editor?.focus();
      }
    }  
  
    morph(template, input) {
      this.type = 'input';
      console.log('morph');
  
      const cell   = document.getElementById(`${this.uid}---output`);
      document.getElementById(`${this.uid}---delim`).remove();
      //make it different id, so it will not conflict
      cell.id = cell.id + '--old';
      const editor = cell.firstChild; 
    
      const parentcellwrapper = cell.parentNode.parentNode.parentNode;
    
      parentcellwrapper.insertAdjacentHTML('afterend', template);
      this.element = document.getElementById(`${this.uid}---input`);

      const newWrapper = this.element.parentNode;
  
      this.element.appendChild(editor);
      cell.parentNode.remove();
  
      this.toolbox();
      this.horisontalToolbox();

      //move the rest of children
      const pos = CellList[this.sign].indexOf(this.uid);
      let lastOne = pos + 1;
      if (pos + 1 < CellList[this.sign].length) {
        if (CellHash.get(CellList[this.sign][pos + 1]).type === 'input') return;

        while(true) {
          if (lastOne === CellList[this.sign].length) break;
          if (CellHash.get(CellList[this.sign][lastOne]).type === 'input') break;
          lastOne++;
        }

        for (let i=pos+1; i<lastOne; ++i) {
          console.log('fetching the prev.. child: '+CellList[this.sign][i]);
          const child = document.getElementById(`${CellList[this.sign][i]}---output`).parentNode;
          newWrapper.appendChild(child);
        }
      }
    }
  
  
    updateState(state) {
      console.log(this.uid);
      const el = document.getElementById(this.uid);
      if (!el) {
        console.warn(this.uid+' does not exist anymore... Probably it was purged in a wrong way');
        return;
      }
      const loader = document.getElementById(this.uid).getElementsByClassName('loader-line')[0];
      console.log(loader);

      console.log(state);
        if (state === 'pending')
          loader.classList.add('loader-line-pending');
        else
          loader.classList.remove('loader-line-pending');
      
      this.state = state;
    }

    horisontalToolbox() {
      this.delim = document.getElementById(this.uid+'---delim');
      const context = this;
      this.delim?.addEventListener('click', ()=>{
        context.addCellAfterAny(context.uid)
      });
    }
  
    toolbox() {
      if (this.type === 'output') throw 'not possible. this is a child cell';
      
      const body = document.getElementById(this.uid).parentNode;
      const toolbox = body.getElementsByClassName('frontend-tools');
      const hide    = body.getElementsByClassName('node-settings-hide')[0];
      const play    = body.getElementsByClassName('node-settings-play')[0];
      let removeoutput    = body.getElementsByClassName('node-settings-removeoutput');
      let initgrouptoggle    = body.getElementsByClassName('node-settings-initgroup');
      let project    = body.getElementsByClassName('node-settings-project');
      

      const addafter   = body.getElementsByClassName('node-settings-add')[0];
      body.onmouseout  =  function(ev) {Array.from(toolbox).forEach((e)=>e.classList.remove("tools-show"))};
      body.onmouseover =  function(ev) {Array.from(toolbox).forEach((e)=>e.classList.add("tools-show"))}; 
      const removeOutput = this.removeOutput;
      const toggleInit = this.toggleInit;
      const addCellAfter = this.addCellAfter;
      const evaluate = () => this.eval(this.display.editor.state.doc.toString());
      const uid = this.uid;
      const self = this;

      if (removeoutput.length > 0) {
        removeoutput[0].addEventListener("click", function (e) {
          removeOutput(uid, self);
        });
      }

      if (project.length > 0) {
        project[0].addEventListener("click", function (e) {
          server.socket.send(`NotebookEvaluateProjected["${uid}"]`);
          server.socket.send(`CellObj["${uid}"]["props"] = Join[CellObj["${uid}"]["props"], <|"projected"->!If[KeyExistsQ[CellObj["${uid}"]["props"], "projected"], CellObj["${uid}"]["props"]["projected"], False]|>]`);
        });
      }      

      if (initgrouptoggle.length > 0) {
        initgrouptoggle[0].addEventListener('click', function(e) {
          document.getElementById(uid+"---input").classList.toggle("cell-init");
          server.socket.send(`CellObj["${uid}"]["props"] = Join[CellObj["${uid}"]["props"], <|"init"->!If[KeyExistsQ[CellObj["${uid}"]["props"], "init"], CellObj["${uid}"]["props"]["init"], False]|>]`);
        })
      }
  
      addafter.addEventListener("click", function (e) {
        addCellAfter(uid, self);
      });

      play?.addEventListener("click", function (e) {
        evaluate();
      });

      self.hideico = hide;
  
      hide.addEventListener("click", function (e) {
        self.hideCell(uid);
      });  
    }

    hideCell(id) {
      const pos = CellList[this.sign].indexOf(this.uid);

      console.log('HIDE!');
      console.log(pos);
      if (pos < 0) {
        console.warn('cell does not exists');
        return;
      }      
      const sign = this.sign;
      if (CellHash.get(CellList[this.sign][pos]).type === 'output') {
        console.log('trying to find parent cell');
        if (pos - 1 >= 0) CellHash.get(CellList[sign][pos - 1]).hideCell();
        return;
      }

      if(document.getElementById(this.uid).getElementsByClassName('output-cell').length === 0) {
        alert('The are no output cells can be hidden');
        return;
      }
      document.getElementById(this.uid+"---input").classList.toggle("cell-hidden");
      const svg = this.hideico.getElementsByTagName('svg');
      svg[0].classList.toggle("icon-hidden");
      server.socket.send(`CellObj["${this.uid}"]["props"] = Join[CellObj["${this.uid}"]["props"], <|"hidden"->!CellObj["${this.uid}"]["props"]["hidden"]|>]`);
      
    }

    hideNext(startpoint) {
      console.log('next h');
      const pos = CellList[this.sign].indexOf(this.uid);
      if (pos + 1 < CellList[this.sign].length) {
        CellHash.get(CellList[this.sign][pos + 1]).hideCell();
      }
    }
  
    hidePrev(startpoint) {
      console.log('prev h');
      const pos = CellList[this.sign].indexOf(this.uid);
      console.log(pos);
      if (pos - 1 >= 0) {
        console.log('good');
        CellHash.get(CellList[this.sign][pos - 1]).hideCell();
      }
    }      
    
    addCellAfter(uid) {  
      const id = uid || this.uid;
      var q = 'NotebookOperate["'+id+'", CellListAddNewAfter]';
  
      this?.display?.forceFocusNext();
  
      server.socket.send(q);  
    }

    removeOutput(uid, self = this) {  
      if (self.type === 'output') return;

      const id = uid || self.uid;
      const sign = self.sign;
      var q = 'NotebookOperate["'+id+'", CellListRemoveAllNextOutput, "'+sign+'"]';
  
      server.socket.send(q);  
    }    

    addCellAfterAny(uid) {  
      const id = uid || this.uid;
      var q = 'NotebookOperate["'+id+'", CellListAddNewAfterAny]';
  
      server.socket.send(q);  
    }    
    
    constructor(template, input) {
      this.uid = input["id"];
      this.type = input["type"];
      this.state = input["state"];
      this.sign = input["sign"];
  
      if (!(this.sign in CellList)) CellList[this.sign] = [];
  
  
      if ('after' in input) {
        console.log('inserting after something');
  
        const beforeType = input["after"]["type"];
        const currentType = input["type"];
        const pos = CellList[this.sign].indexOf(input["after"]["id"]);
  
        if (beforeType === 'input' && currentType === 'input') {
          console.log("input cell after inputcell");
          document.getElementById(input["after"]["id"]).parentNode.insertAdjacentHTML('afterend', template);
        }
  
        if (beforeType === 'output' && currentType === 'input') {
          console.log("input cell after outputcell");
          document.getElementById(input["after"]["id"]+"---output").parentNode.parentNode.parentNode.insertAdjacentHTML('afterend', template);
        }
        
        if (beforeType === 'input' && currentType === 'output') {
          console.log("output cell after inputcell");
          document.getElementById(input["after"]["id"]).insertAdjacentHTML('beforeend', template);
        }   
        
        if (beforeType === 'output' && currentType === 'output') {
          console.log("output cell after outputcell");
          document.getElementById(input["after"]["id"]+"---output").parentNode.insertAdjacentHTML('afterend', template);
        }     
        
        CellList[this.sign].splice(pos+1, 0, input["id"]);
  
  
      } else {
        
        console.log('plain insertion');
        //inject into the right place
        if (this.type === 'output') {
          const prev = CellHash.get(CellList[this.sign].slice(-1));
          if (prev.type === 'input') {
            //inject into parent's holder
            document.getElementById(prev.uid).insertAdjacentHTML('beforeend', template);
          } else {
            //find the parent's holder and inject into the end
            document.getElementById(prev.uid+"---output").parentNode.parentNode.insertAdjacentHTML('beforeend', template);
          }
          
        } else {
          document.getElementById(this.sign).insertAdjacentHTML('beforeend', template);
        }
  
        CellList[this.sign].push(this.uid);
      }
  
      CellHash.add(this);
  
      this.element = document.getElementById(this.uid+"---"+this.type);
      if (this.type === 'input') this.toolbox();
      
      this.horisontalToolbox();
  
      this.display = new window.SupportedCells[input["display"]].view(this, input["data"]);  
      
      const self = this;
      if (this.type === 'input') this.element.addEventListener('focusin', ()=>{
        server.socket.send(`NotebookSelectCell["${self.uid}"]`);
        currentCell = self;
      });
      
      return this;
    }
    
    dispose() {
      //remove a single cell
  
      //call dispose action
      this.display.dispose();
  
      //remove from the list
      const pos = CellList[this.sign].indexOf(this.uid);
      CellList[this.sign].splice(pos, 1);
      //remove hash
      CellHash.remove(this.uid);
  
      //remove dom holders
      if (this.type === 'input') {
        document.getElementById(this.uid).parentNode.remove();
      } else {
        document.getElementById(`${this.uid}---${this.type}`)?.parentNode.remove();
      }    
    }
    
    remove() {
      server.socket.send(`NotebookOperate["${this.uid}", CellListRemoveAccurate];`);
    }
    
    save(content) {
      //const fixed = content.replaceAll('\\\"', '\\\\\"').replaceAll('\"', '\\"');
      server.socket.send(`NotebookOperate["${this.uid}", CellObjSave, "${content}"];`);
    }

    evalString(string) {
      const signature = this.sign;
      return server.askKernel(`Module[{result}, WolframEvaluator["${string}", False, "${signature}"][(result = #1)&]; result]`);
    }
    
    eval(content) {
      if (this.state === 'pending') {
        alert("This cell is still under evaluation");
        return;
      }
  
      //const fixed = content.replaceAll('\\\"', '\\\\\"').replaceAll('\"', '\\"');
      const q = `NotebookEvaluate["${this.uid}"]`;
  
      if($KernelStatus !== 'good' && $KernelStatus !== 'working') {
        alert("No active kernel is attached");
        return;
      }
  
      server.socket.send(q);    
    }
  }

  core.FrontEndRestoreSymbol = async (args, env) => {
    const name = await interpretate(args[0], env);
    console.warn('restoring symbol: '+name);
    interpretate.packedSymbols[name] = args[1];
    server.trackedSymbols[name] = true;
  }
  
  core.FrontEndAssignKernelSocket = async (args, env) => {
    const port = await interpretate(args[0], env);
    if (server.kernel.socket.readyState !== 1) {
      console.log('trying to connect...');
      server.kernel.socket = new WebSocket("ws://"+window.location.hostname+':'+port);
      server.kernel.socket.onopen = function(e) {
        console.warn("[open] Соединение установлено c Kernel");

        console.warn('add tracking for all symbols...');

        Object.keys(server.trackedSymbols).forEach((s)=>{
          console.log('added for '+s);
          server.addTracker(s);
        });

        server.kernel.socket.send('WSSocketEstablish');

        console.warn('Asking for all definitions...');
        server.kernel.socket.send('JerryI`WolframJSFrontend`Remote`Private`GetDefinedSymbols');
      }; 
  
      server.kernel.socket.onmessage = function(event) {
        //create global context
        //callid
        const uid = Date.now() + Math.floor(Math.random() * 100);
        var global = {call: uid};
        interpretate(JSON.parse(event.data), {global: global});
      };
      
      server.kernel.socket.onclose = function(event) {
        console.error("WS connection to kernel server is lost");
        console.error(event);
        //alert('Connection lost. Please, update the page to see new changes.');
      };
  
      return;
    }
  
    server.kernel.socket.send('WSSocketEstablish');
  
  
  }

  core.FrontAddDefinition = async (args, env) => {
    const data = await interpretate(args[0], env);
    console.log(data);
    
    data.forEach((element)=>{
      const name = element[0];
      const context = element[1];
  
      if (!(name in core.FrontAddDefinition.symbols)) {
        window.EditorAutocomplete.extend([  
          {
              "label": name,
              "type": "keyword",
              "info": "User's defined symbol in "+context  
          }]);
  
        core.FrontAddDefinition.symbols[name] = context;
      }
    });


  }

  core.FrontAddDefinition.symbols = {};
  
  core.FrontEndRemoveCell = async function (args, env) {
    var input = await interpretate(args[0]);
    CellHash.get(input["id"]).dispose();
  };
  
  core.FrontEndCellMorphInput = async function (args, env) {
    var template = interpretate(args[0]);
    var input = await interpretate(args[1]);
  
    CellHash.get(input["id"]).morph(template, input);
  }; 
  
  core.FrontEndCellError = async function (args, env) {
    alert(await interpretate(args[1], env));
  };
  
  core.FrontEndTruncated = async function (args, env) {
    env.element.innerHTML = (await interpretate(args[0], env) + " ...");
  }
  
  core.IconizeWrapper = function (args, env) {
    env.element.innerText = "{ ... }";
  }
  
  core.IconizeWrapper.destroy = (args, env) => {}
  
  core.FrontEndTruncated.destroy = (args, env) => {}
  
  core.FrontEndJSEval = function (args, env) {
    eval(interpretate(args[0]));
  } 
  
  core.FrontEndGlobalAbort = function (args, env) {
    const arr = Object.keys(CellHashStorage)
    arr.forEach((el)=>{
      CellHash.get(el)?.updateState('idle');
    });
  }
  
  core.FrontEndUpdateCellState = async function (args, env) {
    const input = await interpretate(args[0], env);
    console.log('update state');
    console.log(input["id"]);
  
    CellHash.get(input["id"]).updateState(input["state"]);
  }
  
  core.FrontEndCreateCell = async function (args, env) {
    var template = interpretate(args[0]);
    var input = await interpretate(args[1]);
  
    new CellWrapper(template, input);
  }
  
  core.FrontEndCreatePreviewCell = function (args, env) {
    //console.log(window.atob(args));
    core.PreviewCell(env.element, window.atob(args));
  }

  core.FrontEndSetTimerForGarbageSymbols = async (args, env) => {
    const time = await interpretate(args[0], env);
    if (interpretate.garbageCollect)
      setTimeout(interpretate.garbageCollect, time);
  }

  core.FrontEditorSelected = async (args, env) => {
    const op = await interpretate(args[0], env);
    if (op == "Get")
      return window.EditorSelected.get();

    if (op == "Set") {
      let data = await interpretate(args[1], env);
      if (data.charAt(0) == '"') data = data.slice(1,-1);
      window.EditorSelected.set(data);
    }
  }

  


  function readFile(file, transport, status=console.log) {
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
          let compressedData = base64ArrayBuffer(event.target.result);
          status(`Sending via POST...`);
          transport(compressedData, file.name).then(()=>{
            status(`Uploaded`);
            setTimeout(()=>{
                env.element.children[0].children[0].classList.remove('enter');
            
            },1000);
          },
          
          () => {
            status(`Failed`);        
          });
          
          // Do something with result
        });
      
        reader.addEventListener('progress', (event) => {
          if (event.loaded && event.total) {
            const percent = (event.loaded / event.total) * 100;
            status(`Uploading: ${Math.round(percent)}`);
          }
        });

        reader.readAsArrayBuffer(file);
      }
  
      function base64ArrayBuffer(arrayBuffer) {
        var base64    = ''
        var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      
        var bytes         = new Uint8Array(arrayBuffer)
        var byteLength    = bytes.byteLength
        var byteRemainder = byteLength % 3
        var mainLength    = byteLength - byteRemainder
      
        var a, b, c, d
        var chunk
      
        // Main loop deals with bytes in chunks of 3
        for (var i = 0; i < mainLength; i = i + 3) {
          // Combine the three bytes into a single integer
          chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
      
          // Use bitmasks to extract 6-bit segments from the triplet
          a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
          b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
          c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
          d = chunk & 63               // 63       = 2^6 - 1
      
          // Convert the raw binary segments to the appropriate ASCII encoding
          base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
        }
      
        // Deal with the remaining bytes and padding
        if (byteRemainder == 1) {
          chunk = bytes[mainLength]
      
          a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
      
          // Set the 4 least significant bits to zero
          b = (chunk & 3)   << 4 // 3   = 2^2 - 1
      
          base64 += encodings[a] + encodings[b] + '=='
        } else if (byteRemainder == 2) {
          chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
      
          a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
          b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4
      
          // Set the 2 least significant bits to zero
          c = (chunk & 15)    <<  2 // 15    = 2^4 - 1
      
          base64 += encodings[a] + encodings[b] + encodings[c] + '='
        }
        
        return base64
      }  

      window.fileCompressor = readFile;
  
  
  
  