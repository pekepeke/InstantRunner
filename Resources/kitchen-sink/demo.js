/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */


define('kitchen-sink/demo',function(require, exports, module) {
"use strict";

require("ace/lib/fixoldbrowsers");
require("ace/config").init();
var env = {};

var dom = require("ace/lib/dom");
var net = require("ace/lib/net");
var lang = require("ace/lib/lang");
var useragent = require("ace/lib/useragent");

var event = require("ace/lib/event");
var theme = require("ace/theme/textmate");
var EditSession = require("ace/edit_session").EditSession;
var UndoManager = require("ace/undomanager").UndoManager;

var vim = require("ace/keyboard/vim").handler;
var emacs = require("ace/keyboard/emacs").handler;
var HashHandler = require("ace/keyboard/hash_handler").HashHandler;

var Renderer = require("ace/virtual_renderer").VirtualRenderer;
var Editor = require("ace/editor").Editor;
var MultiSelect = require("ace/multi_select").MultiSelect;

// workers do not work for file:
if (location.protocol == "file:")
    EditSession.prototype.$useWorker = false;

/************** modes ***********************/
var modes = [];
function getModeFromPath(path) {
    var mode = modesByName.text;
    for (var i = 0; i < modes.length; i++) {
        if (modes[i].supportsFile(path)) {
            mode = modes[i];
            break;
        }
    }
    return mode;
};

var Mode = function(name, desc, extensions) {
    this.name = name;
    this.desc = desc;
    this.mode = "ace/mode/" + name;
    this.extRe = new RegExp("^.*\\.(" + extensions + ")$", "g");
};

Mode.prototype.supportsFile = function(filename) {
    return filename.match(this.extRe);
};

var modesByName = {
    c9search:   ["C9Search"           , "c9search_results"],
    coffee:     ["CoffeeScript"       , "coffee|^Cakefile"],
    csharp:     ["C#"                 , "cs"],
    css:        ["CSS"                , "css"],
    glsl:       ["Glsl"               , "glsl|frag|vert"],
    golang:     ["Go"                 , "go"],
    groovy:     ["Groovy"             , "groovy"],
    haxe:       ["haXe"               , "hx"],
    html:       ["HTML"               , "htm|html|xhtml"],
    c_cpp:      ["C/C++"              , "c|cc|cpp|cxx|h|hh|hpp"],
    clojure:    ["Clojure"            , "clj"],
    jade:       ["Jade"               , "jade"],
    java:       ["Java"               , "java"],
    javascript: ["JavaScript"         , "js"],
    json:       ["JSON"               , "json"],
    jsx:        ["JSX"                , "jsx"],
    latex:      ["LaTeX"              , "latex|tex|ltx|bib"],
    less:       ["LESS"               , "less"],
    liquid:     ["Liquid"             , "liquid"],
    lua:        ["Lua"                , "lua"],
    luapage:    ["LuaPage"            , "lp"], // http://keplerproject.github.com/cgilua/manual.html#templates
    markdown:   ["Markdown"           , "md|markdown"],
    ocaml:      ["OCaml"              , "ml|mli"],
    perl:       ["Perl"               , "pl|pm"],
    php:        ["PHP"                , "php|phtml"],
    python:     ["Python"             , "py"],
    ruby:       ["Ruby"               , "ru|gemspec|rake|rb"],
    scad:       ["OpenSCAD"           , "scad"],
    scala:      ["Scala"              , "scala"],
    scss:       ["SCSS"               , "scss|sass"],
    sh:         ["SH"                 , "sh|bash|bat"],
    svg:        ["SVG"                , "svg"],
    text:       ["Text"               , "txt"],
    textile:    ["Textile"            , "textile"],
    xml:        ["XML"                , "xml|rdf|rss|wsdl|xslt|atom|mathml|mml|xul|xbl"],
    xquery:     ["XQuery"             , "xq"],
    yaml:       ["YAML"               , "yaml"],
    tcl:        ["Tcl"                , "tcl"],
    pgsql:      ["pgSQL"              , "pgsql"],
    powershell: ["Powershell"         , "ps1"],
    sql:        ["SQL"                , "sql"],
    coldfusion: ["ColdFusion"         , "cfm"],
    diff:       ["Diff"               , "diff|patch"]
};

for (var name in modesByName) {
    var mode = modesByName[name];
    mode = new Mode(name, mode[0], mode[1])
    modesByName[name] = mode;
    modes.push(mode);
}


/*********** demo documents ***************************/
var fileCache = {};

function initDoc(file, path, doc) {
    if (doc.prepare)
        file = doc.prepare(file);

    var session = new EditSession(file);
    session.setUndoManager(new UndoManager());
    doc.session = session;
    doc.path = path;
    if (doc.wrapped) {
        session.setUseWrapMode(true);
        session.setWrapLimitRange(80, 80);
    }
    var mode = getModeFromPath(path)
    session.modeName = mode.name;
    session.setMode(mode.mode);
}


function makeHuge(txt) {
    for (var i = 0; i < 5; i++)
        txt += txt;
    return txt
}

var docs = {
    "docs/plaintext.txt": {name: "Plain Text", prepare: makeHuge, wrapped: true},
    "docs/perl.pl": "Perl",
    "docs/python.py": "Python",
    "docs/ruby.rb": "Ruby",
    "docs/php.php": "PHP",
    "docs/sh.sh": "SH",
    "docs/scala.scala": "Scala",
    "docs/scss.scss": "SCSS",
    "docs/markdown.md": {name: "Markdown", wrapped: true},
    "docs/textile.textile": {name: "Textile", wrapped: true},
    "docs/xml.xml": "XML",
    "docs/yaml.yaml": "YAML",
    "docs/javascript.js": "JavaScript",
    "docs/coffeescript.coffee": "Coffeescript",
    "docs/Haxe.hx": "haXe",
    "docs/html.html": "HTML",
    "docs/jade.jade": "Jade",
    "docs/java.java": "Java",
    "docs/json.json": "JSON",
    "docs/jsx.jsx": "JSX",
    "docs/css.css": "CSS",
    "docs/less.less": "LESS",
    "docs/sql.sql": {name: "SQL", wrapped: true},
    "docs/pgsql.pgsql": {name: "pgSQL", wrapped: true},
    "docs/clojure.clj": "Clojure",
    "docs/golang.go": "Go",
    "docs/groovy.groovy": "Groovy",
    "docs/coldfusion.cfm": "ColdFusion",
    "docs/cpp.cpp": "C/C++",
    "docs/csharp.cs": "C#",
    "docs/diff.diff": "Diff",
    "docs/glsl.glsl": "Glsl",
    "docs/latex.tex": {name: "LaTeX", wrapped: true},
    "docs/liquid.liquid": "Liquid",
    "docs/lua.lua": "Lua",
    "docs/luapage.lp": "LuaPage",
    "docs/ocaml.ml": "OCaml",
    "docs/OpenSCAD.scad": "OpenSCAD",
    "docs/powershell.ps1": "Powershell",
    "docs/svg.svg": "SVG",
    "docs/tcl.tcl": "Tcl",
    "docs/xquery.xq": "XQuery",
    "docs/c9search.c9search_results": "C9 Search Results"
}

var ownSource = {
    /* filled from require*/
};

var hugeDocs = {
//    "src/ace.js": "",
//    "src-min/ace.js": ""
};

if (window.require && window.require.s) try {
    for (var path in window.require.s.contexts._.loaded) {
        if (path.indexOf("!") != -1)
            path = path.split("!").pop();
        else
            path = path + ".js";
        ownSource[path] = ""
    }
} catch(e) {}

function prepareDocList(docs) {
    var list = []
    for (var path in docs) {
        var doc = docs[path];
        if (typeof doc != "object")
            doc = {name: doc || path};

        doc.path = path;
        doc.desc = doc.name.replace(/^(ace|docs|demo|build)\//, "");
        if (doc.desc.length > 18)
            doc.desc = doc.desc.slice(0, 7) + ".." + doc.desc.slice(-9)

        fileCache[doc.name] = doc;
        list.push(doc);
    };

    return list;
}

docs = prepareDocList(docs);
ownSource = prepareDocList(ownSource);
hugeDocs = prepareDocList(hugeDocs);

/*********** create editor ***************************/
var container = document.getElementById("editor");

// Splitting.
var Split = require("ace/split").Split;
var split = new Split(container, theme, 1);
env.editor = split.getEditor(0);
split.on("focus", function(editor) {
    env.editor = editor;
    updateUIEditorOptions();
});
env.split = split;
window.env = env;
window.ace = env.editor;
env.editor.setAnimatedScroll(true);

var consoleEl = dom.createElement("div");
container.parentNode.appendChild(consoleEl);
consoleEl.style.position="fixed"
consoleEl.style.bottom = "1px"
consoleEl.style.right = 0
consoleEl.style.background = "white"
consoleEl.style.border = "1px solid #baf"
consoleEl.style.zIndex = "100"
var cmdLine = new singleLineEditor(consoleEl);
cmdLine.editor = env.editor;
env.editor.cmdLine = cmdLine;

env.editor.commands.addCommands([{
    name: "gotoline",
    bindKey: {win: "Ctrl-L", mac: "Command-L"},
    exec: function(editor, line) {
        if (typeof line == "object") {
            var arg = this.name + " " + editor.getCursorPosition().row;
            editor.cmdLine.setValue(arg, 1)
            editor.cmdLine.focus()
            return
        }
        line = parseInt(line, 10);
        if (!isNaN(line))
            editor.gotoLine(line);
    },
    readOnly: true
}, {
    name: "find",
    bindKey: {win: "Ctrl-F", mac: "Command-F"},
    exec: function(editor, needle) {
        if (typeof needle == "object") {
            var arg = this.name + " " + editor.getCopyText()
            editor.cmdLine.setValue(arg, 1)
            editor.cmdLine.focus()
            return
        }
        editor.find(needle);
    },
    readOnly: true
}, {
    name: "focusCommandLine",
    bindKey: "shift-esc",
    exec: function(editor, needle) { editor.cmdLine.focus(); },
    readOnly: true
}])

cmdLine.commands.bindKeys({
    "Shift-Return|Ctrl-Return|Alt-Return": function(cmdLine) { cmdLine.insert("\n")},
    "Esc|Shift-Esc": function(cmdLine){ cmdLine.editor.focus(); },
    "Return": function(cmdLine){
        var command = cmdLine.getValue().split(/\s+/);
        var editor = cmdLine.editor;
        editor.commands.exec(command[0], editor, command[1]);
        editor.focus();
    },
})

cmdLine.commands.removeCommands(["find", "gotoline", "findall", "replace", "replaceall"])

/**
 * This demonstrates how you can define commands and bind shortcuts to them.
 */

var commands = env.editor.commands;
commands.addCommand({
    name: "save",
    bindKey: {win: "Ctrl-S", mac: "Command-S"},
    exec: function() {alert("Fake Save File");}
});

var keybindings = {
    // Null = use "default" keymapping
    ace: null,
    vim: vim,
    emacs: emacs,
    // This is a way to define simple keyboard remappings
    custom: new HashHandler({
        "gotoright":      "Tab",
        "indent":         "]",
        "outdent":        "[",
        "gotolinestart":  "^",
        "gotolineend":    "$"
     })
};



/*********** manage layout ***************************/
var consoleHight = 20;
function onResize() {
    var left = env.split.$container.offsetLeft;
    var width = document.documentElement.clientWidth - left;
    container.style.width = width + "px";
    container.style.height = document.documentElement.clientHeight - consoleHight + "px";
    env.split.resize();

    consoleEl.style.width = width + "px";
    cmdLine.resize()
}

window.onresize = onResize;
onResize();

/*********** options pane ***************************/
var docEl = document.getElementById("doc");
var modeEl = document.getElementById("mode");
var wrapModeEl = document.getElementById("soft_wrap");
var themeEl = document.getElementById("theme");
var foldingEl = document.getElementById("folding");
var selectStyleEl = document.getElementById("select_style");
var highlightActiveEl = document.getElementById("highlight_active");
var showHiddenEl = document.getElementById("show_hidden");
var showGutterEl = document.getElementById("show_gutter");
var showPrintMarginEl = document.getElementById("show_print_margin");
var highlightSelectedWordE = document.getElementById("highlight_selected_word");
var showHScrollEl = document.getElementById("show_hscroll");
var animateScrollEl = document.getElementById("animate_scroll");
var softTabEl = document.getElementById("soft_tab");
var behavioursEl = document.getElementById("enable_behaviours");

var group = document.createElement("optgroup");
group.setAttribute("label", "Mode Examples");
fillDropdown(docs, group);
docEl.appendChild(group);
var group = document.createElement("optgroup");
group.setAttribute("label", "Huge documents");
fillDropdown(hugeDocs, group);
docEl.appendChild(group);
var group = document.createElement("optgroup");
group.setAttribute("label", "own source");
fillDropdown(ownSource, group);
docEl.appendChild(group);


fillDropdown(modes, modeEl);

bindDropdown("mode", function(value) {
    env.editor.getSession().setMode(modesByName[value].mode || modesByName.text.mode);
    env.editor.getSession().modeName = value;
});

bindDropdown("doc", function(name) {
    var doc = fileCache[name];
    if (!doc)
        return;

    if (doc.session)
        return setSession(doc.session)

    //@todo do something while waiting
    // env.editor.setSession(emptySession || (emptySession = new EditSession("")))
    var path = doc.path;
    var parts = path.split("/");
    if (parts[0] == "docs")
        path = "kitchen-sink/" + path;
    else if (parts[0] == "ace")
        path = "lib/" + path;

    net.get(path, function(x) {
        initDoc(x, path, doc);
        setSession(doc.session)
    })

    function setSession(session) {
        var session = env.split.setSession(session);
        updateUIEditorOptions();
        env.editor.focus();
    }
});

function updateUIEditorOptions() {
    var editor = env.editor;
    var session = editor.session;

    session.setFoldStyle(foldingEl.value);

    saveOption(docEl, session.name);
    saveOption(modeEl, session.modeName || "text");
    saveOption(wrapModeEl, session.getUseWrapMode() ? session.getWrapLimitRange().min || "free" : "off");

    saveOption(selectStyleEl, editor.getSelectionStyle() == "line");
    saveOption(themeEl, editor.getTheme());
    saveOption(highlightActiveEl, editor.getHighlightActiveLine());
    saveOption(showHiddenEl, editor.getShowInvisibles());
    saveOption(showGutterEl, editor.renderer.getShowGutter());
    saveOption(showPrintMarginEl, editor.renderer.getShowPrintMargin());
    saveOption(highlightSelectedWordE, editor.getHighlightSelectedWord());
    saveOption(showHScrollEl, editor.renderer.getHScrollBarAlwaysVisible());
    saveOption(animateScrollEl, editor.getAnimatedScroll());
    saveOption(softTabEl, session.getUseSoftTabs());
    saveOption(behavioursEl, editor.getBehavioursEnabled());
}

function saveOption(el, val) {
    if (!el.onchange && !el.onclick)
        return;

    if ("checked" in el) {
        if (val !== undefined)
            el.checked = val;

        localStorage && localStorage.setItem(el.id, el.checked ? 1 : 0);
    }
    else {
        if (val !== undefined)
            el.value = val;

        localStorage && localStorage.setItem(el.id, el.value);
    }
}

event.addListener(themeEl, "mouseover", function(e){
    this.desiredValue = e.target.value;
    if (!this.$timer)
        this.$timer = setTimeout(this.updateTheme);
})

event.addListener(themeEl, "mouseout", function(e){
    this.desiredValue = null;
    if (!this.$timer)
        this.$timer = setTimeout(this.updateTheme, 20);
})

themeEl.updateTheme = function(){
    env.split.setTheme(themeEl.desiredValue || themeEl.selectedValue);
    themeEl.$timer = null;
}

bindDropdown("theme", function(value) {
    if (!value)
        return;
    env.editor.setTheme(value);
    themeEl.selectedValue = value;
});

bindDropdown("keybinding", function(value) {
    env.editor.setKeyboardHandler(keybindings[value]);
});

bindDropdown("fontsize", function(value) {
    env.split.setFontSize(value);
});

bindDropdown("folding", function(value) {
    env.editor.getSession().setFoldStyle(value);
    env.editor.setShowFoldWidgets(value !== "manual");
});

bindDropdown("soft_wrap", function(value) {
    var session = env.editor.getSession();
    var renderer = env.editor.renderer;
    switch (value) {
        case "off":
            session.setUseWrapMode(false);
            renderer.setPrintMarginColumn(80);
            break;
        case "40":
            session.setUseWrapMode(true);
            session.setWrapLimitRange(40, 40);
            renderer.setPrintMarginColumn(40);
            break;
        case "80":
            session.setUseWrapMode(true);
            session.setWrapLimitRange(80, 80);
            renderer.setPrintMarginColumn(80);
            break;
        case "free":
            session.setUseWrapMode(true);
            session.setWrapLimitRange(null, null);
            renderer.setPrintMarginColumn(80);
            break;
    }
});

bindCheckbox("select_style", function(checked) {
    env.editor.setSelectionStyle(checked ? "line" : "text");
});

bindCheckbox("highlight_active", function(checked) {
    env.editor.setHighlightActiveLine(checked);
});

bindCheckbox("show_hidden", function(checked) {
    env.editor.setShowInvisibles(checked);
});

bindCheckbox("display_indent_guides", function(checked) {
    env.editor.setDisplayIndentGuides(checked);
});

bindCheckbox("show_gutter", function(checked) {
    env.editor.renderer.setShowGutter(checked);
});

bindCheckbox("show_print_margin", function(checked) {
    env.editor.renderer.setShowPrintMargin(checked);
});

bindCheckbox("highlight_selected_word", function(checked) {
    env.editor.setHighlightSelectedWord(checked);
});

bindCheckbox("show_hscroll", function(checked) {
    env.editor.renderer.setHScrollBarAlwaysVisible(checked);
});

bindCheckbox("animate_scroll", function(checked) {
    env.editor.setAnimatedScroll(checked);
});

bindCheckbox("soft_tab", function(checked) {
    env.editor.getSession().setUseSoftTabs(checked);
});

bindCheckbox("enable_behaviours", function(checked) {
    env.editor.setBehavioursEnabled(checked);
});

bindCheckbox("fade_fold_widgets", function(checked) {
    env.editor.setFadeFoldWidgets(checked);
});

var secondSession = null;
bindDropdown("split", function(value) {
    var sp = env.split;
    if (value == "none") {
        if (sp.getSplits() == 2) {
            secondSession = sp.getEditor(1).session;
        }
        sp.setSplits(1);
    } else {
        var newEditor = (sp.getSplits() == 1);
        if (value == "below") {
            sp.setOrientation(sp.BELOW);
        } else {
            sp.setOrientation(sp.BESIDE);
        }
        sp.setSplits(2);

        if (newEditor) {
            var session = secondSession || sp.getEditor(0).session;
            var newSession = sp.setSession(session, 1);
            newSession.name = session.name;
        }
    }
});

function bindCheckbox(id, callback) {
    var el = document.getElementById(id);
    if (localStorage && localStorage.getItem(id))
        el.checked = localStorage.getItem(id) == "1";

    var onCheck = function() {
        callback(!!el.checked);
        saveOption(el);
    };
    el.onclick = onCheck;
    onCheck();
}

function bindDropdown(id, callback) {
    var el = document.getElementById(id);
    if (localStorage && localStorage.getItem(id))
        el.value = localStorage.getItem(id);

    var onChange = function() {
        callback(el.value);
        saveOption(el);
    };

    el.onchange = onChange;
    onChange();
}

function fillDropdown(list, el) {
    list.forEach(function(item) {
        var option = document.createElement("option");
        option.setAttribute("value", item.name);
        option.innerHTML = item.desc;
        el.appendChild(option);
    });
}


/************** dragover ***************************/
event.addListener(container, "dragover", function(e) {
    return event.preventDefault(e);
});

event.addListener(container, "drop", function(e) {
    var file;
    try {
        file = e.dataTransfer.files[0];
        if (window.FileReader) {
            var reader = new FileReader();
            reader.onload = function() {
                var mode = getModeFromPath(file.name);

                env.editor.session.doc.setValue(reader.result);
                modeEl.value = mode.name;
                env.editor.session.setMode(mode.mode);
                env.editor.session.modeName = mode.name;
            };
            reader.readAsText(file);
        }
        return event.preventDefault(e);
    } catch(err) {
        return event.stopEvent(e);
    }
});

// add multiple cursor support to editor
require("ace/multi_select").MultiSelect(env.editor);



function singleLineEditor(el) {
    var renderer = new Renderer(el);
    renderer.scrollBar.element.style.display = "none";
    renderer.scrollBar.width = 0;
    renderer.content.style.height = "auto";

    renderer.screenToTextCoordinates = function(x, y) {
        var pos = this.pixelToScreenCoordinates(x, y);
        return this.session.screenToDocumentPosition(
            Math.min(this.session.getScreenLength() - 1, Math.max(pos.row, 0)),
            Math.max(pos.column, 0)
        );
    };
    // todo size change event
    renderer.$computeLayerConfig = function() {
        var longestLine = this.$getLongestLine();
        var firstRow = 0;
        var lastRow = this.session.getLength();
        var height = this.session.getScreenLength() * this.lineHeight;

        this.scrollTop = 0;
        var config = this.layerConfig;
        config.width = longestLine;
        config.padding = this.$padding;
        config.firstRow = 0;
        config.firstRowScreen = 0;
        config.lastRow = lastRow;
        config.lineHeight = this.lineHeight;
        config.characterWidth = this.characterWidth;
        config.minHeight = height;
        config.maxHeight = height;
        config.offset = 0;
        config.height = height;

        this.$gutterLayer.element.style.marginTop = 0 + "px";
        this.content.style.marginTop = 0 + "px";
        this.content.style.width = longestLine + 2 * this.$padding + "px";
        this.content.style.height = height + "px";
        this.scroller.style.height = height + "px";
        this.container.style.height = height + "px";
    };
    renderer.isScrollableBy=function(){return false};

    var editor = new Editor(renderer);
    new MultiSelect(editor);
    editor.session.setUndoManager(new UndoManager());

    editor.setHighlightActiveLine(false);
    editor.setShowPrintMargin(false);
    editor.renderer.setShowGutter(false);
    editor.renderer.setHighlightGutterLine(false);
    return editor;
};


/** simple statusbar **/
var editor = env.editor;
var statusBarEl = dom.createElement("div");
statusBarEl.style.cssText = "color:gray;position:absolute;right:0;border-left:1px solid";
cmdLine.container.appendChild(statusBarEl);
var statusUpdate = lang.deferredCall(function() {
    var status = [];
    function add(s, sep) {s && status.push(s, sep || "|")}
    if (editor.$vimModeHandler)
        add(editor.$vimModeHandler.getStatusText());
    else if (editor.commands.recording)
        add("REC");
    
    var c = editor.selection.lead;
    add(c.row + ":" + c.column, " ");
    if (!editor.selection.isEmpty()) {
        var r = editor.getSelectionRange()
        add("(" + (r.end.row - r.start.row) + ":"  +(r.end.column - r.start.column) + ")");
    }
    status.pop();
    statusBarEl.textContent = status.join("");
});

env.editor.on("changeStatus", function() {
    statusUpdate.schedule(50);
});
env.editor.on("changeSelection", function() {
    statusUpdate.schedule(50);
});


});

/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define('ace/split',function(require, exports, module) {
"use strict";

var oop = require("./lib/oop");
var lang = require("./lib/lang");
var EventEmitter = require("./lib/event_emitter").EventEmitter;

var Editor = require("./editor").Editor;
var Renderer = require("./virtual_renderer").VirtualRenderer;
var EditSession = require("./edit_session").EditSession;

/** internal, hide
 * class Split
 *
 *
 *
 **/

/** internal, hide
 * new Split(container, theme, splits)
 * - container (Document): The document to associate with the split
 * - theme (String): The name of the initial theme
 * - splits (Number): The number of initial splits
 *
 *
 *
 **/

var Split = function(container, theme, splits) {
    this.BELOW = 1;
    this.BESIDE = 0;

    this.$container = container;
    this.$theme = theme;
    this.$splits = 0;
    this.$editorCSS = "";
    this.$editors = [];
    this.$orientation = this.BESIDE;

    this.setSplits(splits || 1);
    this.$cEditor = this.$editors[0];


    this.on("focus", function(editor) {
        this.$cEditor = editor;
    }.bind(this));
};

(function(){

    oop.implement(this, EventEmitter);

    this.$createEditor = function() {
        var el = document.createElement("div");
        el.className = this.$editorCSS;
        el.style.cssText = "position: absolute; top:0px; bottom:0px";
        this.$container.appendChild(el);
        var editor = new Editor(new Renderer(el, this.$theme));

        editor.on("focus", function() {
            this._emit("focus", editor);
        }.bind(this));

        this.$editors.push(editor);
        editor.setFontSize(this.$fontSize);
        return editor;
    };

    /** internal, hide
     * Split.setSplits(splits) -> Void
     * - splits (Number): The new number of splits
     *
     * 
     *
     **/
    this.setSplits = function(splits) {
        var editor;
        if (splits < 1) {
            throw "The number of splits have to be > 0!";
        }

        if (splits == this.$splits) {
            return;
        } else if (splits > this.$splits) {
            while (this.$splits < this.$editors.length && this.$splits < splits) {
                editor = this.$editors[this.$splits];
                this.$container.appendChild(editor.container);
                editor.setFontSize(this.$fontSize);
                this.$splits ++;
            }
            while (this.$splits < splits) {
                this.$createEditor();
                this.$splits ++;
            }
        } else {
            while (this.$splits > splits) {
                editor = this.$editors[this.$splits - 1];
                this.$container.removeChild(editor.container);
                this.$splits --;
            }
        }
        this.resize();
    };

    /**
     * Split.getSplits() -> Number
     *
     * Returns the number of splits.
     *
     **/
    this.getSplits = function() {
        return this.$splits;
    };

    /**
     * Split.getEditor(idx) -> Editor
     * -idx (Number): The index of the editor you want
     *
     * Returns the editor identified by the index `idx`.
     *
     **/
    this.getEditor = function(idx) {
        return this.$editors[idx];
    };

    /**
     * Split.getCurrentEditor() -> Editor
     *
     * Returns the current editor.
     *
     **/
    this.getCurrentEditor = function() {
        return this.$cEditor;
    };

    /** related to: Editor.focus
     * Split.focus() -> Void
     *
     * Focuses the current editor.
     *
     **/
    this.focus = function() {
        this.$cEditor.focus();
    };

    /** related to: Editor.blur
     * Split.blur() -> Void
     *
     * Blurs the current editor.
     *
     **/
    this.blur = function() {
        this.$cEditor.blur();
    };

    /** related to: Editor.setTheme
     * Split.setTheme(theme) -> Void
     * - theme (String): The name of the theme to set
     * 
     * Sets a theme for each of the available editors.
     **/
    this.setTheme = function(theme) {
        this.$editors.forEach(function(editor) {
            editor.setTheme(theme);
        });
    };

    /** internal, hide
     * Split.setKeyboardHandler(keybinding) -> Void
     * - keybinding (String):
     * 
     *
     **/
    this.setKeyboardHandler = function(keybinding) {
        this.$editors.forEach(function(editor) {
            editor.setKeyboardHandler(keybinding);
        });
    };

    /** internal, hide
     * Split.forEach(callback, scope) -> Void
     * - callback (Function): A callback function to execute
     * - scope (String): 
     * 
     * Executes `callback` on all of the available editors. 
     *
     **/
    this.forEach = function(callback, scope) {
        this.$editors.forEach(callback, scope);
    };

    /** related to: Editor.setFontSize
     * Split.setFontSize(size) -> Void
     * - size (Number): The new font size
     * 
     * Sets the font size, in pixels, for all the available editors.
     *
     **/
    this.$fontSize = "";
    this.setFontSize = function(size) {
        this.$fontSize = size;
        this.forEach(function(editor) {
           editor.setFontSize(size);
        });
    };

    this.$cloneSession = function(session) {
        var s = new EditSession(session.getDocument(), session.getMode());

        var undoManager = session.getUndoManager();
        if (undoManager) {
            var undoManagerProxy = new UndoManagerProxy(undoManager, s);
            s.setUndoManager(undoManagerProxy);
        }

        // Overwrite the default $informUndoManager function such that new delas
        // aren't added to the undo manager from the new and the old session.
        s.$informUndoManager = lang.deferredCall(function() { s.$deltas = []; });

        // Copy over 'settings' from the session.
        s.setTabSize(session.getTabSize());
        s.setUseSoftTabs(session.getUseSoftTabs());
        s.setOverwrite(session.getOverwrite());
        s.setBreakpoints(session.getBreakpoints());
        s.setUseWrapMode(session.getUseWrapMode());
        s.setUseWorker(session.getUseWorker());
        s.setWrapLimitRange(session.$wrapLimitRange.min,
                            session.$wrapLimitRange.max);
        s.$foldData = session.$cloneFoldData();

        return s;
    };

   /** related to: Editor.setSession
     * Split.setSession(session, idx) -> Void
     * - session (EditSession): The new edit session
     * - idx (Number): The editor's index you're interested in
     * 
     * Sets a new [[EditSession `EditSession`]] for the indicated editor.
     *
     **/
    this.setSession = function(session, idx) {
        var editor;
        if (idx == null) {
            editor = this.$cEditor;
        } else {
            editor = this.$editors[idx];
        }

        // Check if the session is used already by any of the editors in the
        // split. If it is, we have to clone the session as two editors using
        // the same session can cause terrible side effects (e.g. UndoQueue goes
        // wrong). This also gives the user of Split the possibility to treat
        // each session on each split editor different.
        var isUsed = this.$editors.some(function(editor) {
           return editor.session === session;
        });

        if (isUsed) {
            session = this.$cloneSession(session);
        }
        editor.setSession(session);

        // Return the session set on the editor. This might be a cloned one.
        return session;
    };

   /** internal, hide
     * Split.getOrientation() -> Number
     * 
     * Returns the orientation.
     *
     **/
    this.getOrientation = function() {
        return this.$orientation;
    };

   /** internal, hide
     * Split.setOrientation(oriantation) -> Void
     * - oriantation (Number):
     *
     * Sets the orientation.
     *
     **/
    this.setOrientation = function(orientation) {
        if (this.$orientation == orientation) {
            return;
        }
        this.$orientation = orientation;
        this.resize();
    };

   /**  internal
     * Split.resize() -> Void
     *
     *
     *
     **/
    this.resize = function() {
        var width = this.$container.clientWidth;
        var height = this.$container.clientHeight;
        var editor;

        if (this.$orientation == this.BESIDE) {
            var editorWidth = width / this.$splits;
            for (var i = 0; i < this.$splits; i++) {
                editor = this.$editors[i];
                editor.container.style.width = editorWidth + "px";
                editor.container.style.top = "0px";
                editor.container.style.left = i * editorWidth + "px";
                editor.container.style.height = height + "px";
                editor.resize();
            }
        } else {
            var editorHeight = height / this.$splits;
            for (var i = 0; i < this.$splits; i++) {
                editor = this.$editors[i];
                editor.container.style.width = width + "px";
                editor.container.style.top = i * editorHeight + "px";
                editor.container.style.left = "0px";
                editor.container.style.height = editorHeight + "px";
                editor.resize();
            }
        }
    };

}).call(Split.prototype);

   /**  internal
     * Split.UndoManagerProxy() -> Void
     *
     *  
     *
     **/
function UndoManagerProxy(undoManager, session) {
    this.$u = undoManager;
    this.$doc = session;
}

(function() {
    this.execute = function(options) {
        this.$u.execute(options);
    };

    this.undo = function() {
        var selectionRange = this.$u.undo(true);
        if (selectionRange) {
            this.$doc.selection.setSelectionRange(selectionRange);
        }
    };

    this.redo = function() {
        var selectionRange = this.$u.redo(true);
        if (selectionRange) {
            this.$doc.selection.setSelectionRange(selectionRange);
        }
    };

    this.reset = function() {
        this.$u.reset();
    };

    this.hasUndo = function() {
        return this.$u.hasUndo();
    };

    this.hasRedo = function() {
        return this.$u.hasRedo();
    };
}).call(UndoManagerProxy.prototype);

exports.Split = Split;
});
