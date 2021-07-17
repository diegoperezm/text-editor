"use strict";
/*
 espeak:
  -s <integer>
    Spe//ed in words per minute, default is 160 
  --punct="<characters>"
    Speak the names of punctuation characters during speaking.
    If =<characters> is omitted, all punctuation is spoken
*/
const { Machine, interpret, assign } = require("xstate");
const { spawn }  = require("child_process");
const   ed       = spawn("ed", ["-v"]);
const   esp      = spawn("espeak", ["--punct", "-s", 180]);
const   readline = require("readline");

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}

//  IDK a better way to capture ed stdout
ed.stdout.on("data", (data) => {
  let input = data.toString().split(/(\s)/);
  input.forEach((elem) => {
    esp.stdin.write(`${elem}\n`);
  });
  process.stdout.write(`${data}\n`);
});

//ed sends messages using stderr: errors and info
ed.stderr.on("data", (data) => {
  process.stdout.write(`textEditor output ${data}\n`);
  esp.stdin.write(`textEditor output\n`);
  esp.stdin.write(`${data}\n`);
});

// REPLACE:  implement this without using a global var (word)
var word = "";
process.stdin.on("keypress", function (s, key) {
  switch (s) {
    case "":
      // backspace
      break;
    case " ":
      //esp.stdin.write(`space\n`);
      esp.stdin.write(`${word}\n`);
      word = "";
      process.stdout.write(s);
      textEditorService.send(" ");
      break;
    case "\r":
      esp.stdin.write(`${s}\n`);
      process.stdout.write(s);
      textEditorService.send("ret");
      break;
    default:
      word += `${s}`;
      esp.stdin.write(`${s}\n`);
      process.stdout.write(s);
      textEditorService.send(s);
  }
});




const OPTIONS = {
    actions: {
      appendMessage:   appendMessage,
      insertMessage:   insertMessage,
      changeMessage:   changeMessage,
      idleMessage:     idleMessage,
      deleteMessage:   deleteMessage,
      welcomeMessage:  welcomeMessage,
      prefixMessage:   prefixMessage,
      enterAppend:     enterAppend,
      enterInsert:     enterInsert,
      enterChange:     enterChange,
      enterDelete:     enterDelete,
      fileNameMessage: fileNameMessage,
      openfile:        openfile,
      writeFile:       writeFile,
      line:            line,
      numberLine:      numberLine,
      exitMessage:     exitMessage,
      exit:            exit,
      checkLine:       checkLine,
      sendLine:        sendLine,
      sendPrefix:      sendPrefix,
      terminateInput:  terminateInput,
      setPrefix:       assign({ prefix: (ctx, evt) => ctx.prefix.concat(evt.type)}),
      done:            done,
      editFileMessage: editFileMessage,
    },
    services: {}
};

const IDLE =  {
        entry: ["idleMessage"],
        on: {
          0: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          1: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          2: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          3: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          4: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          5: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          6: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          7: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          8: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          9: { target: "#textEditor.INPUT.PREFIX", actions:['setPrefix'] },
          a: { target: "#textEditor.COMMANDS.APPEND" },
          i: { target: "#textEditor.COMMANDS.INSERT" },
          c: { target: "#textEditor.COMMANDS.CHANGE" },
          d: { target: "#textEditor.COMMANDS.DELETE" },
          e: { target: "#textEditor.COMMANDS.EDITFILE" },
          w: { target: "#textEditor.COMMANDS.WRITEFILE" },
          n: { target: "#textEditor.COMMANDS.NUMBERLINE" },
          l: { target: "#textEditor.COMMANDS.LINE" },
          q: { target: "EXIT" },
        }
};

const INPUT ={
            initial: "PREFIX",
            states: {
             PREFIX: {
                  entry: ["prefixMessage"],
                  on: {
                      ret: { target: 'SENDPREFIX' },
                      n:   { target: '#textEditor.IDLE', actions: ["numberLine"] },
                      "*": { actions: [
                          assign({ prefix: (ctx, evt) => ctx.prefix.concat(evt.type)})
                             ]
                      },
                  }
              },
             SENDPREFIX: {
                 entry: ['sendPrefix', 'done'],
                 exit:  [assign({prefix: (ctx, evt) => "" })],
                 on: {
                     done: {target: '#textEditor.IDLE'}
                 } 
             },
            }
}; 

const COMMANDS ={
    initial: "APPEND",
    states: {
       APPEND: {
        entry: ["appendMessage"],
        on: {
            done: { target: "EDITLINE.EDITING", actions:["enterAppend"] },
        },
       },

       INSERT: {
        entry: ["insertMessage"],
        on: {
            done: { target: "EDITLINE.EDITING", actions: ["enterInsert"] },
        },
      }, 

      CHANGE: {
        entry: ["changeMessage"],
        on: {
            done: { target: "EDITLINE.EDITING", actions: ['enterChange'] },
        },
      }, 

      DELETE: {
        entry: ["deleteMessage"],
        on: {
            done: { target: "#textEditor.IDLE" , actions: ["enterDelete"]},
        },
      }, 
      EDITLINE: {
          initial: "EDITING",
          states: {
              EDITING: {
                      on: {
                        ret: {
                          target: "CHECKLINE",
                        },
                        "*": {
                          actions: [
                            assign({ lineStr: (ctx, evt) => ctx.lineStr.concat(evt.type) }),
                          ],
                        },
                      },
                    },
                    CHECKLINE: {
                      entry: ["checkLine"],
                      on: {
                        inputTerminate: {
                          target: "#textEditor.IDLE",
                          actions: ["terminateInput"],
                        },
                        aLine: {
                          target: "SENDLINE",
                        },
                      },
                    },
              
                    // there is a bug using always + assign
                    SENDLINE: {
                      entry: ["done"],
                      exit: ["sendLine"],
                      on: {
                        done: { target: "CLEARLINE" },
                      },
                    },
                    // there is a bug using always + assign
                    CLEARLINE: {
                      entry: ["done"],
                      exit: [assign({ lineStr: (ctx, evt) => "" })],
                      on: {
                        done: { target: "EDITING" },
                      },
              },
         }
     },
     WRITEFILE: {
                 entry: ["writeFile"],
                 exit:  [ assign({ lineStr: (ctx, evt) => "" }) ],
                   on: {
                       done: { target: "#textEditor.IDLE" }
                   },
                // always: { target: "#textEditor.IDLE" }, // this doesn't show in the viz 
               },

      EDITFILE: {
          entry: ['editFileMessage'],
         initial: "FILENAME",
            states: {
               FILENAME: {
                 entry: ["fileNameMessage"],
                 on: {
                   ret: { target: "OPENFILE" },
                   "*": {
                     actions: [
                       assign({ filename: (ctx, evt) => ctx.filename.concat(evt.type) }),
                     ],
                   },
                 },
               }, 

               OPENFILE: {
                 entry: ["openfile"],
                   on: {
                       done: { target: "#textEditor.IDLE" }

                   },
               },

            }

      }, 

       NUMBERLINE: {
           entry: ['numberLine'],
           on: {
               done:  { target: '#textEditor.IDLE' }
           }
       },

       LINE: {
           entry: ['line'],
           on: {
               done: { target: '#textEditor.IDLE' }
           }
       },
    } // states
};

const WELCOME = { 
          entry: ["welcomeMessage", "done"],
          on: {
              done: {target: "#textEditor.IDLE"}
          }
};

const EXIT = {
        entry: ["exitMessage"],
        on: {
          y: { actions: ["exit"] },
          n: { target: "IDLE" },
        },
};

const textEditorMachine = Machine(
  {
    id: "textEditor",
    initial: "WELCOME",
    context: {
      filename: "",
       lineStr: "",
        prefix: "",
    },
    states: {
      WELCOME , 
      IDLE, 
      INPUT, 
      COMMANDS,
      EXIT
    } 
  },
    OPTIONS,
  );

const textEditorService = interpret(textEditorMachine).onTransition((state) => {
   // console.log( state.value , state.context, "\n");
});

textEditorService.start();

function prefixMessage() {
  esp.stdin.write("prefix\n");
}

function sendPrefix(ctx, evt) {
  word = "";
  ed.stdin.write(ctx.prefix + "\n");
}

function done() {
  textEditorService.send("done");
}

function checkLine(ctx, evt) {
  let tempArr = ctx.lineStr.split("");
  let isEnd = tempArr.every((l) => l === " " || l === ".");
  if (isEnd) {
    textEditorService.send("inputTerminate");
  } else {
    textEditorService.send("aLine");
  }
}

function sendLine(ctx) {
  process.stdout.write(`${ctx.lineStr}\n`);
  ed.stdin.write(ctx.lineStr + "\n");
}


function terminateInput(ctx) {
  esp.stdout.write(`terminate input\n`);
  process.stdout.write(".\n");
  ed.stdin.write(`.\n`);
}

function insertMessage() {
  // REPLACE: implement this without using a global var (word)
  word = "";
  esp.stdin.write("insert\n");
}

function enterInsert() {
  process.stdout.write("\n");
  ed.stdin.write(`i\n`);
}

function appendMessage() {
  // REPLACE: implement this without using a global var (word)
  word = "";
  esp.stdin.write("append\n");
  textEditorService.send('done');
}

function enterAppend() {
  process.stdout.write("\n");
  ed.stdin.write(`a\n`);
}

function changeMessage() {
  // REPLACE: implement this without using a global var (word)
  word = "";
  esp.stdin.write("change\n");
}

function enterChange() {
  process.stdout.write("\n");
  ed.stdin.write(`c\n`);
}

function deleteMessage() {
  // REPLACE: implement this without using a global var (word)
  word = "";
  esp.stdin.write("delete\n");
}

function enterDelete() {
  process.stdout.write("\n");
  ed.stdin.write(`d\n`);
}

function exit() {
  ed.stdin.write(`q\n`);
  process.exit();
}

function exitMessage() {
  esp.stdin.write("confirm exit\n");
  esp.stdin.write("y or n\n");
  process.stdout.write(" confirm exit:  y or n \n");
}

function numberLine() {
  // REPLACE: implement this without using a global var (word)
  //          later implement a better 'done' async await? 
   word = "";
  esp.stdin.write("line number\n");
  process.stdout.write("\n");
  ed.stdin.write(`n\n`);
  textEditorService.send('done');
}

function line() {
  // REPLACE: implement this without using a global var (word)
  //          later implement a better 'done' async await? 
  word = "";
  esp.stdin.write("line\n");
  process.stdout.write("\n");
  ed.stdin.write(`l\n`);
  textEditorService.send('done');
}

function openfile(ctx) {
  // REPLACE: implement this without using a global var (word)
  //          later implement a better 'done' async await? 
  word = "";
  process.stdout.write("\n");
  ed.stdin.write(`e ${ctx.filename}`.trim() + '\n');
  textEditorService.send('done');
}


function writeFile(ctx) {
  // REPLACE    later implement a better 'done' async await? 
  process.stdout.write(`write file\n`);
  esp.stdout.write("write file\n");
  ed.stdin.write(`w\n`);
  textEditorService.send('done');
}



function welcomeMessage() {
  process.stdout.write("Hello, this is a modal, line oriented, with audio cues text editor.\n");
  esp.stdin.write("Hello \n");
  esp.stdin.write("this is a modal\n");
  esp.stdin.write("line oriented\n");
  esp.stdin.write("with audio cues\n");
  esp.stdin.write("text editor\n");
}

function editFileMessage() {
  esp.stdin.write("edit \n");
}

function fileNameMessage() {
  // REPLACE: implement this without using a global var (word)
  word = "";
  process.stdout.write("\n");
  esp.stdin.write("write \n");
  esp.stdin.write("filename\n");
}

function idleMessage() {
  // REPLACE: implement this without using a global var (word)
  word = "";

  process.stdout.write("\n");
  esp.stdin.write("command\n");
}









// IGNORE: this one is for the viz
/*
var A = {
    actions: {
        appendMessage:   () => {},
        insertMessage:   () => {},
        changeMessage:   () => {},
        idleMessage:     () => {},
        deleteMessage:   () => {},
        welcomeMessage:  () => {},
        prefixMessage:   () => {},
        enterAppend:     () => {},
        enterInsert:     () => {},
        enterChange:     () => {},
        enterDelete:     () => {},
        fileNameMessage: () => {},
        openfile:        () => {},
        writeFile:       () => {},
        line:            () => {},
        numberLine:      () => {},
        exitMessage:     () => {},
        exit:            () => {},
        checkLine:       () => {},
        sendLine:        () => {},
        sendPrefix:      () => {},
        terminateInput:  () => {},
        setPrefix:       () => {},
        done:            () => {},
        editFileMessage: () => {},
    },
}
*/


