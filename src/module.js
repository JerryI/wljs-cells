;;
function __emptyFalse(a) {
  if (a === '') return false;
  return a;
}

function throttle(func, ms) {

  let isThrottled = false,
    savedArgs,
    savedThis;

  function wrapper() {

    if (isThrottled) { // (2)
      savedArgs = arguments;
      savedThis = this;
      return;
    }

    func.apply(this, arguments); // (1)

    isThrottled = true;

    setTimeout(function() {
      isThrottled = false; // (3)
      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs);
        savedArgs = savedThis = null;
      }
    }, ms);
  }

  return wrapper;
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

  static remove = (uid, ev) => {
    CellHash.get(uid).dispose();
  }

  static morph = (uid, template, props) => {
    CellHash.get(uid).morph(template, props);
  }

  static setContent = (uid, content) => {
    CellHash.get(uid).setContent(content);
  }

  static toggleCell = (uid) => {
    CellHash.get(uid).toggle(true);
  }

  static vanishCell = (uid) => {
    CellHash.get(uid).vanish();
  }

  static fadeCell = (uid) => {
    CellHash.get(uid).fade(true);
  }

  static lockCell = (uid) => {
    CellHash.get(uid).lock();
  }  

  

  static setInit = (uid, state) => {
    CellHash.get(uid).setInit(state);
  }

  static unhideAll = (nid) => {
    const list = Notebook[nid].Cells; 
    if (!list) return;
    
    list.forEach((h) => {
      const cell = CellHash.get(h);
      if (cell.type == 'Input' && !cell.invisible) {
        cell.toggle(false);
      }
    });
  }

  channel;

  focusNext(skipOutputs = false) {
    console.log('next');
    focusDirection = 1;

    const list = Notebook[this.notebook].Cells; 

    const pos = list.indexOf(this.uid);
    if (pos + 1 < list.length) {
      const next = CellHash.get(list[pos + 1]);
      if (next.display.editor && (!skipOutputs || (next.type == 'Input')) && !next.invisible && !next.props["Locked"]) {
        
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
    } else if (self.props["Fade"] && self.type == 'Input') {
      //temporary unhide it
      self.fade(false);
      self._fade_block = true;
      self.display.editor.focus();

      function leftFocus() {
        self.fade(false);
        self._fade_block = false;
        self.element.removeEventListener('focusout', leftFocus);
      }

      self.element.addEventListener('focusout', leftFocus);       
    } {
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
      if (prev.display.editor && !prev.invisible && !prev.props["Locked"]) {
        prev.focus();
      } else {
        //go futher
        prev.focusPrev();
      }
      
    }
  }

  vanish() {
    this.group.classList.toggle('invisible-cell');
    if (this.invisible) {
      this.invisible  = false;
      if (this.display.editor) {
        this.display.readOnly(false);
      }       
    } else {
      this.invisible = true;
      if (this.display.editor) {
        this.display.readOnly(true);
      }       
    }
  }

  fade() {
    if (this.type == 'Output') return;
    const wrapper = document.getElementById(this.uid);
    wrapper.classList.toggle('h-fade-20');

    if (!this.props["Fade"]) {
      this.setProp('Fade', true);
    } else {
      this.setProp('Fade', false);
    }    
  }

  lock() {
    if (this.type == 'Output') return;
    const wrapper = document.getElementById(this.uid);
    wrapper.classList.toggle('blur');

    if (!this.props["Locked"]) {
      this.setProp('Locked', true);
      if (this.display.editor) {
        this.display.readOnly(true);
      }
    } else {
      this.setProp('Locked', false);
      if (this.display.editor) {
        this.display.readOnly(false);
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

    const wrapper = document.getElementById(this.uid);
    wrapper.classList.toggle('hidden');

    if (!this.props["Hidden"]) {
      this.setProp('Hidden', true);
    } else {
      this.setProp('Hidden', false);
    }

    if (jump) this.focusNext();
    return true;
  }

  setProp(key, value) {
    this.props[key] = value;
    const uid = this.uid;
    server.emitt(this.channel, '"'+JSON.stringify({Cell: uid, Key: key, Value: value}).replace(/"/gm, "\\\"")+'"', "SetProperty");
  }

  addCellAfter() {
    server.emitt(this.channel, '"'+this.uid+'"', 'AddAfter');
  }

  addCellBefore() {
    server.emitt(this.channel, '"'+this.uid+'"', 'AddBefore');
  }  

  findInput() {
    const self = this;
    if (this.type == 'Input') return self;
    const list = Notebook[this.notebook].Cells;
    return CellHash.get(list[list.indexOf(self.uid)-1]).findInput();
  }

  save(content) {
    //const fixed = content.replaceAll('\\\"', '\\\\\"').replaceAll('\"', '\\"');
    this.throttledSave(content)
  }
  
  constructor(template, input, list, eventid, meta = {}) {

    this.uid         = input["Hash"];
    this.channel     = eventid;
    //this.state       = input["State"];
    this.type        = input["Type"];
    this.notebook    = input["Notebook"];
    this.invisible   = input["Invisible"];
    this.props       = input["Props"];

    const oldNotebook = (Notebook[input["Notebook"]]);

    let _list = [];
    if (oldNotebook) {
      _list = [...oldNotebook.Cells];
    }

    const notebook = Notebook.add(input["Notebook"], list); 
    const pos  = notebook.Cells.indexOf(this.uid);
    console.log(pos);

     console.log('position: '+ pos);
     console.log(this.uid);
     console.log('in the list');
     console.log(notebook.Cells);

    CellHash.add(this);

    const self = this;

    this.throttledSave = throttle((content) => {
      server.emitt(self.channel, '{"'+self.uid+'","'+(content)+'"}', "UpdateCell");
    }, 300);

    CellWrapper.prolog.forEach((f) => f({cell: self, props: input, event: eventid}));

    if (pos == 0) {
      console.log('First cell!');
      notebook.element.insertAdjacentHTML('beforeend', template);

    } else {
      let next;
      if (!meta["IgnoreList"]) next = notebook.Cells[pos + 1];
    
      let parent = notebook.Cells[pos - 1];  

      if (next) next   = CellHash.get(  next);
                parent = CellHash.get(parent);
      
      if (parent.type == 'Input' && this.type == 'Input') {
        console.log('Insert after input input cell');
        document.getElementById('group-' + parent.uid).insertAdjacentHTML('afterend', template);

        if (next) {
          if (next.type == "Output") {
            //find all kids and move them
            const currentKids = document.getElementById('children-' + this.uid);
            const starting = _list.indexOf(parent.uid);
            let iterator = starting + 1;

            while(iterator < _list.length) {
              const o = CellHash.get(_list[iterator]);
              if (o.type === 'Input') break;

              const node = o.group;
              currentKids.appendChild(node);
              iterator ++ ;
            }
          }
        } 

      } else if (parent.type == 'Input' && this.type == 'Output') {
        console.log('Insert after input output cell');
        document.getElementById('children-' + parent.uid).insertAdjacentHTML('beforeend', template);

      } else if (parent.type == 'Output' && this.type == 'Input') {
        console.log('Insert after output input cell');
        //find input parent first
        const inputparent = parent.findInput();

        if (next) {
          if (next.type == 'Input') {
            document.getElementById('group-' + inputparent.uid).insertAdjacentHTML('afterend', template);
          } else {
            //the most complecated case. We need to break a chain
            console.warn('Restructuring cells...');
            //insert after the parent input firstly
            document.getElementById('group-' + inputparent.uid).insertAdjacentHTML('afterend', template);
            //now we need to move all kids starting from prev

            const currentKids = document.getElementById('children-' + this.uid);
            //move kids starting from ...
            const starting = _list.indexOf(next.uid);
            let iterator = starting;

            while(iterator < _list.length) {
              const o = CellHash.get(_list[iterator]);
              if (o.type === 'Input') break;

              const node = o.group;
              currentKids.appendChild(node);
              iterator ++ ;
            }

          }
        } else {
          document.getElementById('group-' + inputparent.uid).insertAdjacentHTML('afterend', template);
        }

      } else if (parent.type == 'Output' && this.type == 'Output') {
        console.log('Insert after output output cell');
        document.getElementById('group-' + parent.uid).insertAdjacentHTML('afterend', template);

      } else {
        console.error(parent);
        console.error(this);
        throw('Unexpected value!');
      }

      
    }

    this.group       = document.getElementById('group-' + input["Hash"]);

    this.element = document.getElementById(this.uid);
    this.display = new window.SupportedCells[input["Display"]].view(this, input["Data"]);  

    if (!notebook.focusedFirst && meta["FocusFirst"]) {
      if (this.type == 'Input' && this.display.editor && !(this.props["Locked"] || this.invisible || this.props["Hidden"])) {
        notebook.focusedFirst = true;
        this.display.editor.focus();
      }
    }

    if (this.props["Locked"] || this.invisible) {
      if (this.display.editor) {
        this.display.readOnly(true);
      } 
    } 

    if (this.type == 'Input') {
      this.element.addEventListener('focusin', ()=>{
        //call on cell focus event
        server.emitt(self.uid, 'True', 'Focus');
        if (!self._fade_block && self.props["Fade"]) {

          self.fade(true);

          function leftFocus() {
            self.fade(false);
            self.element.removeEventListener('focusout', leftFocus);
          }
    
          self.element.addEventListener('focusout', leftFocus);  
        }
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

    //setTimeout(() => self.group.classList.remove('-translate-x-6'), 50);
    
    
    return this;
  }

  setInit(state) {
    const icon = document.getElementById('gi-'+this.uid);
    if (state) {
      icon.classList.remove('hidden');
    } else {
      icon.classList.add('hidden');
    }
  }

  setContent(content) {
    
    if (!this.display.editor) return;
    if (this.display.setContent) {
      this.display.setContent(content);
    }
  }

  morph(template, input) {
    const notebook = Notebook[this.notebook]; 
    const pos  = notebook.Cells.indexOf(this.uid);
    const inputparent = this.findInput();

    const self = this;
    const eventid = this.channel;

    CellWrapper.prolog.forEach((f) => f({cell: self, props: input, event: eventid, morph: true}));

    const afterInputParent = document.getElementById('group-' + inputparent.uid);
    //temporary move
    afterInputParent.parentNode.appendChild(this.element);
    this.element.id = this.element.id + 'temporal';

    //remove original group
    this.group.remove();

    //add new template on its place
    document.getElementById('group-' + inputparent.uid).insertAdjacentHTML('afterend', template);
    this.group = document.getElementById('group-' + this.uid);

    //insert original into a new container
    const dummy = document.getElementById(this.uid);
    dummy.after(this.element);
    //remove template's version
    dummy.remove();

    //restore uid
    this.element.id = this.uid;

    //fuckmylife
    //move kids

    const currentKids = document.getElementById('children-' + this.uid);
    //move kids starting from ...
    const starting = notebook.Cells.indexOf(this.uid);
    let iterator = starting + 1;

    while(iterator < notebook.Cells.length) {
      const o = CellHash.get(notebook.Cells[iterator]);
      if (o.type === 'Input') break;

      const node = o.group;
      currentKids.appendChild(node);
      iterator ++ ;
    }

    this.type = 'Input';

    this.element.addEventListener('focusin', ()=>{
      //call on cell focus event
      server.emitt(self.uid, 'True', 'Focus');
      currentCell = self;
    });

    CellWrapper.epilog.forEach((f) => f({cell: self, props: input, event: eventid, morph: true}));
    self.display.editor.focus();
  }

  eval(content) {
    if (this.type == "Output") console.warn('Output cell cannot be evaluated, but we will try to convert it');
    server.emitt(this.channel, '"'+this.uid+'"', 'Evaluate');  
  }  
  
  dispose() {
    const group = this.group;
    group.classList.add('scale-50');

    

    //remove from the list
    const list = Notebook[this.notebook].Cells; 
    const pos = list.indexOf(this.uid);

    list.splice(pos, 1);
    //remove hash
    CellHash.remove(this.uid);

    //remove dom holders
    setTimeout(() => {
      this.display.dispose();
      group.remove();
    }, 100);
  }
  
  remove(jump = true, direction = -1) {
    server.emitt(this.channel, '"'+this.uid+'"', 'RemoveCell');
    if (jump) {
      if (this.type == 'Output') {
        if (direction < 0) this.focusPrev(); else this.focusNext();
      } else {
        if (direction < 0) {
          this.focusPrev();
        } else {
          this.focusNext(true);
        }
      }
    }
  }


};;


window.WindowWrapper = class {
  uid = ''
  element;
  notebook = '';

  channel;

  focus() {
    if (!this.display.editor) return;
    this.display.editor.focus();
  }
  
  constructor(template, input, list, eventid, meta = {}) {

    this.uid         = input["Hash"];
    this.channel     = eventid;
    this.state       = input["State"];
    this.type        = input["Type"];
    this.notebook    = input["Notebook"];

    const self = this;

    const notebook = Notebook.add(input["Notebook"], {}); 

    this.throttledSave = throttle((content) => {
      console.warn('editing inside window is not permitted');
    }, 150);

    notebook.element.innerHTML = "";
    notebook.element.insertAdjacentHTML('beforeend', template);

    this.group       = document.getElementById('group-' + input["Hash"]);

    this.element = document.getElementById(this.uid);
    this.display = new window.SupportedCells[input["Display"]].view(this, input["Data"]);  

    //if (this.type == 'Input') {
      this.element.addEventListener('focusin', ()=>{
        //call on cell focus event
        server.emitt(self.uid, 'True', 'Focus');
        currentCell = self;
      });
    //}

    //CellWrapper.epilog.forEach((f) => f({cell: self, props: input, event: eventid}));

    //global JS event
    const newCellEvent = new CustomEvent("newWindowCreated", { detail: self });
    window.dispatchEvent(newCellEvent);

    //setTimeout(() => self.group.classList.remove('-translate-x-6'), 50);
    return this;
  }
}