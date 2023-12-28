;;
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

const Notebook = {};
      Notebook.add = (sign, list) => {
        
        if (sign in Notebook) {
          if (list) Notebook[sign].Cells = list;
          return Notebook[sign];
        }
        Notebook[sign] = {
          element: document.getElementById("container-"+sign),
          Cells: []
        };
        if (list) Notebook[sign].Cells = list;
        return Notebook[sign];
      }

core.CellHash = CellHash;
core.Notebook = Notebook;

let currentCell;

let forceFocusNew = false;
let focusDirection = 1;


window.CellWrapper = class {
  uid = ''
  notebook = ''
  type = "Input"
  element;

  static epilog = []
  static prolog = []

  channel;

  focusNext(startpoint) {
    console.log('next');
    focusDirection = 1;

    const list = Notebook[this.notebook].Cells; 

    const pos = list.indexOf(this.uid);
    if (pos + 1 < list.length) {
      const next = CellHash.get(list[pos + 1]);
      if (next.display.editor) {
        
        next.focus();
      } else {
        //go futher
        next.focusNext();
      }
    } else {
      this.addCellAfter();
    }
  }

  focus() {
    if (!this.display.editor) return;

    const self = this;
    if (self.props["Hidden"] && self.type == 'Input') {
      //temporary unhide it
      self.toggle(false);
      self.display.editor.focus();

      function leftFocus() {
        self.toggle(false);
        self.element.removeEventListener('focusout', leftFocus);
      }

      self.element.addEventListener('focusout', leftFocus);            
    } else {
      self.display.editor.focus();
    }
  }

  focusPrev(startpoint) {
    console.log('prev');
    focusDirection = -1;


    const list = Notebook[this.notebook].Cells; 

    const pos = list.indexOf(this.uid);

    if (pos - 1 >= 0) {
      const prev = CellHash.get(list[pos - 1]);
      if (prev.display.editor) {
        prev.focus();
      } else {
        //go futher
        prev.focusPrev();
      }
      
    }
  }
  
  toggle(jump = true) {
    if (this.type == 'Output') return;

    const list = Notebook[this.notebook].Cells; 
    const pos = list.indexOf(this.uid);

    if (!(pos + 1 < list.length)) {
      alert('There are no output cells to be hidden');
      return;
    }
    if (CellHash.get(list[pos + 1]).type != 'Output') {
      alert('There are no output cells to be hidden');
      return;
    }

    const frame = document.getElementById('frame-'+this.uid);
    frame.classList.toggle('hidden');

    if (!this.props["Hidden"]) {
      this.setProp('Hidden', true);
    } else {
      this.setProp('Hidden', false);
    }

    if (jump) this.focusNext();
    
  }

  setProp(key, value) {
    this.props[key] = value;
    const uid = this.uid;
    server.emitt(this.channel, '"'+JSON.stringify({Cell: uid, Key: key, Value: value}).replace(/"/gm, "\\\"")+'"', "SetProperty");
  }

  addCellAfter() {
    server.emitt(this.channel, '"'+this.uid+'"', 'AddAfter');
  }

  findInput() {
    const self = this;
    if (this.type == 'Input') return self;
    const list = Notebook[this.uid].Cells;
    return CellHash.get(list[list.indexOf(self.uid)-1]).findInput();
  }
  
  constructor(template, input, list, eventid) {

    this.uid         = input["Hash"];
    this.channel     = eventid;
    this.type        = input["Type"];
    this.notebook    = input["Notebook"];
    this.props       = input["Props"];

    console.log(this);

    const notebook = Notebook.add(input["Notebook"], list); 
    const pos  = notebook.Cells.indexOf(this.uid);
    console.log(pos);

     console.log('position: '+ pos);
     console.log(this.uid);
     console.log('in the list');
     console.log(notebook.Cells);

    CellHash.add(this);

    const self = this;
    CellWrapper.prolog.forEach((f) => f({cell: self, props: input, event: eventid}));

    if (pos == 0) {
      console.log('First cell!');
      notebook.element.insertAdjacentHTML('beforeend', template);

    } else {
      let next   = notebook.Cells[pos + 1];
      let parent = notebook.Cells[pos - 1];  

      if (next) next   = CellHash.get(  next);
                parent = CellHash.get(parent);
      
      if (parent.type == 'Input' && this.type == 'Input') {
        console.log('Insert after input input cell');
        document.getElementById('group-' + parent.uid).insertAdjacentHTML('afterend', template);

        if (next) {
          if (next.type == "Output") {
            const parentKids = document.getElementById('children-' + parent.uid);
            const currentKids = document.getElementById('children-' + this.uid);
            //move kids
            for (let i=0; i<parentKids.children.length; ++i) {
              const node = parentKids.children[i];
              currentKids.appendChild(node);
            }
          }
        } 

      } else if (parent.type == 'Input' && this.type == 'Output') {
        console.log('Insert after input output cell');
        document.getElementById('children-' + parent.uid).insertAdjacentHTML('beforeend', template);

      } else if (parent.type == 'Output' && this.type == 'Input') {
        console.log('Insert after output input cell');
        //find input parent first
        parent = parent.findInput();
        document.getElementById('group-' + parent.uid).insertAdjacentHTML('afterend', template);

      } else if (parent.type == 'Output' && this.type == 'Output') {
        console.log('Insert after output output cell');
        document.getElementById('children-' + parent.uid).insertAdjacentHTML('beforeend', template);

      } else {
        console.error(parent);
        console.error(this);
        throw('Unexpected value!');
      }

    }

    this.element = document.getElementById(this.uid);
    this.display = new window.SupportedCells[input["Display"]].view(this, input["Data"]);  

    if (this.type == 'Input') {
      this.element.addEventListener('focusin', ()=>{
        //call on cell focus event
        server.emitt(self.uid, 'True', 'Focus');
        currentCell = self;
      });
    }

    CellWrapper.epilog.forEach((f) => f({cell: self, props: input, event: eventid}));

    //global JS event
    const newCellEvent = new CustomEvent("newCellCreated", { detail: self });
    window.dispatchEvent(newCellEvent);

    //force focus flag
    if (forceFocusNew && this.type == 'Input') {
      console.warn('focus input cell');
      forceFocusNew = false;
      this.display?.editor?.focus();
    }
    
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
  
  remove(jump = false, direction = 1) {
    server.socket.send(`NotebookOperate["${this.uid}", CellListRemoveAccurate];`);
    if (jump) {
      let pos = CellList[this.sign].indexOf(this.uid);
      let current = this;
      const origin = this;

      if (direction > 0) {

        while (pos + 1 < CellList[this.sign].length) {
          current = CellHash.get(CellList[this.sign][pos + 1]);
          pos++;

          if (origin.type == 'output') {
            current.focus();
            break;
          }

          if (origin.type == 'input' && current.type == 'input') {
            current.focus();
          }
        } 

      } else {

        if (pos - 1 >= 0) {
          current = CellHash.get(CellList[this.sign][pos - 1]);
          current.focus();
        } 

      }
      
    }
  }
  
  save(content) {
    //const fixed = content.replaceAll('\\\"', '\\\\\"').replaceAll('\"', '\\"');
    server.socket.send(`NotebookOperate["${this.uid}", CellObjSave, "${content}"];`);
  }

  evalString(string) {
    const signature = this.sign;
    return server.askKernel(`Module[{result}, WolframEvaluator["${string}", False, "${signature}", Null][(result = #1)&]; result]`);
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
};;