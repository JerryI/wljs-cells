BeginPackage["JerryI`WLJSCells`", {"JerryI`WolframJSFrontend`Utils`", "JerryI`WSP`", "KirillBelov`WebSocketHandler`"}]

WLJSCellsFire::usage = "WLJSCellsFire[SocketObject][EventName][CellObject]"
WLJSCellsFakeFire::usage = "internal"
WLJSCellsPopupFire::usage = "fires popups"
WindowCellFire::usage = "WindowCellFire"

Begin["Private`"]

$ContextAliases["jsfn`"] = "JerryI`WolframJSFrontend`Notebook`";

DefaultSerializer = ExportByteArray[#, "ExpressionJSON"]&
Public = ParentDirectory[$InputFileName//DirectoryName]

WLJSCellsFire[addr_]["NewCell"][cell_] := (
    (*looks ugly actually. we do not need so much info*)
    console["log", "fire event `` for ``", cell, addr];
    With[
        {
            obj = <|
                        "id"->cell[[1]], 
                        "sign"->cell["sign"],
                        "type"->cell["type"],
                        "data"->If[cell["data"]//NullQ, "", ExportString[cell["data"], "String", CharacterEncoding -> "UTF8"] ],
                        "props"->cell["props"],
                        "display"->cell["display"],
                        "state"->If[StringQ[ cell["state"] ], cell["state"], "idle"]
                    |>,
            
            template = LoadPage[FileNameJoin[{"template", cell["type"]<>".wsp"}], {Global`id = cell[[1]]}, "Base"->Public]
        },

        WebSocketSend[addr, Global`FrontEndCreateCell[template, obj ] // DefaultSerializer];
    ];
);

WLJSCellsFire[addr_]["RemovedCell"][cell_] := (
    (*actually frirstly you need to check!*)
  
    With[
        {
            obj = <|
                        "id"->cell[[1]], 
                        "sign"->cell["sign"],
                        "type"->cell["type"]
                    |>
        },

        WebSocketSend[addr, Global`FrontEndRemoveCell[obj] // DefaultSerializer];
    ];
);

WLJSCellsFire[addr_]["UpdateState"][cell_] := (
    With[
        {
            obj = <|
                        "id"->cell[[1]], 
                        "sign"->cell["sign"],
                        "type"->cell["type"],
                        "state"->cell["state"]
                    |>
        },

        WebSocketSend[addr, Global`FrontEndUpdateCellState[obj ] // DefaultSerializer];
    ];
);

WLJSCellsFire[addr_]["AddCellAfter"][next_, parent_] := (
    Print["Add cell after"];
    (*looks ugly actually. we do not need so much info*)
    console["log", "fire event `` for ``", next, addr];
    With[
        {
            obj = <|
                        "id"->next[[1]], 
                        "sign"->next["sign"],
                        "type"->next["type"],
                        "data"->If[next["data"]//NullQ, "", ExportString[next["data"], "String", CharacterEncoding -> "UTF8"] ],
                        "props"->next["props"],
                        "display"->next["display"],
                        "state"->If[StringQ[ next["state"] ], next["state"], "idle"],
                        "after"-> <|
                            "id"->parent[[1]], 
                            "sign"->parent["sign"],
                            "type"->parent["type"]                           
                        |>
                    |>,
            
            template = LoadPage[FileNameJoin[{"template", next["type"]<>".wsp"}], {Global`id = next[[1]]}, "Base":>Public]
        },


        WebSocketSend[addr, Global`FrontEndCreateCell[template, obj ] // DefaultSerializer];
    ];
);

WLJSCellsFire[addr_]["CellMorphInput"][cell_] := (
    (*looks ugly actually. we do not need so much info*)
    console["log", "fire event `` for ``", cell, addr];
    With[
        {
            obj = <|
                        "id"->cell[[1]], 
                        "sign"->cell["sign"],
                        "type"->cell["type"]
                    |>,
            
            template = LoadPage[FileNameJoin[{"template", "input.wsp"}], {Global`id = cell[[1]]}, "Base"->Public]
        },

        WebSocketSend[addr, Global`FrontEndCellMorphInput[template, obj ] // DefaultSerializer];
    ];
);

WLJSCellsFire[addr_]["CellError"][cell_, text_] := Module[{template},
    Print[Red<>"ERROR"];
    Print[Reset];

    With[{t = text},
        template = LoadPage[FileNameJoin[{"template", "error.wsp"}], {Global`id = cell, Global`from = "Wolfram Evaluator", Global`message = t}, "Base"->Public];
    ];

    WebSocketSend[addr, Global`FrontEndPopUp[template, text//ToString] // DefaultSerializer];
];

WLJSCellsFire[channel_]["Warning"][text_] := Module[{template},
    With[{t = text},
        template = LoadPage[FileNameJoin[{"template", "warning.wsp"}], {Global`id = CreateUUID[], Global`from = "Wolfram Evaluator", Global`message = t}, "Base"->Public];
    ];
    Print[Yellow<>"Warning"];
    Print[text];
    Print[Reset];

    WebSocketSend[jsfn`Notebooks[channel]["channel"],  Global`FrontEndPopUp[template, text//ToString]];
];

WLJSCellsPopupFire[name_, text_] := Module[{template},
    With[{t = text},
        template = LoadPage[FileNameJoin[{"template", name<>".wsp"}], {Global`id = CreateUUID[], Global`from = "JS Console", Global`message = t}, "Base"->Public];
    ];
    Print[Blue<>"loopback"];
    Print[Reset];
    Print[text];
 
    WebSocketSend[Global`client, Global`FrontEndPopUp[template, text//ToString] // DefaultSerializer];
];


WLJSCellsFire[channel_]["Print"][text_] := Module[{template},
    With[{t = text},
        template = LoadPage[FileNameJoin[{"template", "print.wsp"}], {Global`id = CreateUUID[], Global`from = "Wolfram Evaluator", Global`message = t}, "Base":>Public];
    ];
    Print[Green<>"Print"];
    Print[Reset];
    Print["params"];
    Print[text];
    WebSocketSend[jsfn`Notebooks[channel]["channel"],  Global`FrontEndPopUp[template, text//ToString]];
];

WLJSCellsFire[addr_]["CellMove"][cell_, parent_] := (
    With[
        {   template = LoadPage[FileNameJoin[{"template", cell["type"]<>".wsp"}], {Global`id = cell[[1]]}, "Base"->Public],
            obj = <|
                    "cell"-> <|
                        "id"->cell[[1]], 
                        "sign"->cell["sign"],
                        "type"->cell["type"],
                        "child"->If[NullQ[ cell["child"] ], "", cell["child"][[1]]],
                        "parent"->If[NullQ[ cell["parent"] ], "", cell["parent"][[1]]],
                        "next"->If[NullQ[ cell["next"] ], "", cell["next"][[1]]],
                        "prev"->If[NullQ[ cell["prev"] ], "", cell["prev"][[1]]]
                    |>,

                    "parent"-> <|
                        "id"->parent[[1]], 
                        "sign"->parent["sign"],
                        "type"->parent["type"],
                        "child"->If[NullQ[ parent["child"] ], "", parent["child"][[1]]],
                        "parent"->If[NullQ[ parent["parent"] ], "", parent["parent"][[1]]],
                        "next"->If[NullQ[ parent["next"] ], "", parent["next"][[1]]],
                        "prev"->If[NullQ[ parent["prev"] ], "", parent["prev"][[1]]]                        
                    |>
                |>
        },

        WebSocketSend[addr, Global`FrontEndMorpCell[template, obj ] // DefaultSerializer];
    ];
);

WLJSCellsFire[addr_]["CellMorph"][cell_] := (Null);

(* fake events for forming standalone app *)

WLJSCellsFakeFire[array_]["NewCell"][cell_] := (
    (*looks ugly actually. we do not need so much info*)
    console["log", "fire event `` for ``", cell, array];
    With[
        {
            obj = <|
                        "id"->cell[[1]], 
                        "sign"->cell["sign"],
                        "type"->cell["type"],
                        "data"->If[cell["data"]//NullQ, "", ExportString[cell["data"], "String", CharacterEncoding -> "UTF8"] ],
                        "child"->If[NullQ[ cell["child"] ], "", cell["child"][[1]]],
                        "parent"->If[NullQ[ cell["parent"] ], "", cell["parent"][[1]]],
                        "next"->If[NullQ[ cell["next"] ], "", cell["next"][[1]]],
                        "prev"->If[NullQ[ cell["prev"] ], "", cell["prev"][[1]]],
                        "props"->cell["props"],
                        "display"->cell["display"],
                        "state"->If[StringQ[ cell["state"] ], cell["state"], "idle"]
                    |>,
            
            template = LoadPage[FileNameJoin[{"template", cell["type"]<>".wsp"}], {Global`id = cell[[1]]}, "Base"->Public]
        },

        array["Push", Global`FrontEndCreateCell[template, obj ]];
    ];
);





WindowCellFire[addr_, origin_]["AddCellAfter"][next_, parent_] := (
    Print["Add window cell "];
    (*looks ugly actually. we do not need so much info*)
    console["log", "fire event `` for ``", next, addr];
    With[
        {
            obj = <|
                        "id"->next[[1]], 
                        "sign"->next["sign"],
                        "type"->"input",
                        "data"->If[next["data"]//NullQ, "", ExportString[next["data"], "String", CharacterEncoding -> "UTF8"] ],
                        "props"->next["props"],
                        "display"->next["display"],
                        "state"->If[StringQ[ next["state"] ], next["state"], "idle"]
                    |>,
            
            template = LoadPage[FileNameJoin[{"template", "compact.wsp"}], {Global`id = next[[1]]}, "Base":>Public]
        },


        WebSocketSend[addr, Global`FrontEndCreateCell[template, obj ] // DefaultSerializer];
    ];

    With[
        {
            obj = <|
                        "id"->next[[1]], 
                        "sign"->next["sign"],
                        "type"->next["type"],
                        "data"->"- Projected -",
                        "props"->next["props"],
                        "display"->next["display"],
                        "state"->If[StringQ[ next["state"] ], next["state"], "idle"],
                        "after"-> <|
                            "id"->parent[[1]], 
                            "sign"->parent["sign"],
                            "type"->parent["type"]                           
                        |>
                    |>,
            
            template = LoadPage[FileNameJoin[{"template", next["type"]<>".wsp"}], {Global`id = next[[1]]}, "Base":>Public]
        },


        WebSocketSend[origin, Global`FrontEndCreateCell[template, obj ] // DefaultSerializer];
    ];    
);

WindowCellFire[addr_, origin_]["RemovedCell"][cell_] := (
    (*actually frirstly you need to check!*)
  
    With[
        {
            obj = <|
                        "id"->cell[[1]], 
                        "sign"->cell["sign"],
                        "type"->cell["type"]
                    |>
        },

        WebSocketSend[addr, Global`FrontEndRemoveCell[obj] // DefaultSerializer];
    ];

    With[
        {
            obj = <|
                        "id"->cell[[1]], 
                        "sign"->cell["sign"],
                        "type"->cell["type"]
                    |>
        },

        WebSocketSend[origin, Global`FrontEndRemoveCell[obj] // DefaultSerializer];
    ];
);

End[]

EndPackage[]

NotebookUse["EventFire", WLJSCellsFire]
NotebookUse["WindowEventFire", WindowCellFire]
NotebookUse["FakeEventFire", WLJSCellsFakeFire]
NotebookUse["PopupFire", WLJSCellsPopupFire]