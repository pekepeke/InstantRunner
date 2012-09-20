!function($) {
	function do_run() {
			var t = ""
			, src = env.editor.getValue()
			, cmd_name = ""
			, raw_html = false;
			
			switch (env.editor.session.modeName) {
			case 'html':
				t = src;
				raw_html = true;
				break;
			case 'javascript':
				t = eval(src);
			break;
			case 'perl':
				cmd_name = "perl";
			break;
			case 'php':
				cmd_name = "php";
			break;
			case 'python':
				cmd_name = "python";
			break;
			case 'ruby':
				cmd_name = "ruby";
			break;
			case 'scala':
				cmd_name = "scala";
			break;
			case 'scss':
				cmd_name = "scss";
			case 'textile':
				t = textile.convert(src);
				with_exec = false;
				raw_html = true;
			break;
			case 'markdown':
				t = new Showdown.converter().makeHtml(src);
				with_exec = false;
				raw_html = true;
			break;
			default:
			t = 'compiler not found:' + env.editor.session.modeName;
			}
			
			if (cmd_name) {
			Titanium.API.info("#run")
			try {
				t = do_shell(cmd_name, src);
			} catch (e) {
				Titanium.API.info(e);
			}
			Titanium.API.info("#fin run")
				setResultText(t, raw_html);
			Titanium.API.info("#text")
/*
				// XXX can't write pipe… alloc error
				var command = Titanium.platform.match(/^win/) ? ["C:\\Windows\\System32\\cmd.exe", "/C", cmd_name] : [cmd_name];
                command = ["/usr/bin/echo"];
				var pipe = Titanium.Process.createPipe();
				var proc = Titanium.Process.createProcess(command);
                
				var lines = [];
				proc.setOnReadLine(function(data) {
					lines.push( (data||"") );
			    	Titanium.API.info(data);
				});
				proc.setOnExit(function() {
					setResultText(lines.join("\n"), raw_html);
				});
                
				Titanium.API.info(cmd_name);
				proc.stdin.attach(pipe);
				Titanium.API.info(cmd_name);
				proc.launch();
//						pipe.attach(proc.stdin);
*/
				
			} else {
				setResultText(t, raw_html);
			}
/*
// http://tidesdk.multipart.net/docs/user-dev/generated/#!/api/Ti.Process.Pipe
var echoCmd = Titanium.platform === "win32" ? ["C:\\Windows\\System32\\cmd.exe", "/C", "echo"] : ["/bin/echo"];

echoCmd.push("Data.from.echo!");

var moreCmd = Titanium.platform === "win32" ? ["C:\\Windows\\System32\\more.com"] : ["cat"];

// Create the processes.
var echo = Titanium.Process.createProcess(echoCmd);
var more = Titanium.Process.createProcess(moreCmd);

//Code for displaying the data received by the 'more' process.
more.setOnReadLine(function(data) {
alert(data.toString());
});

//Attaching the processes through IO pipes below.
echo.stdout.attach(more.stdin);
//Launching Processes.
echo.launch();
more.launch();
*/

			// t = src;
	};
	$('run').addEventListener('click', do_run,  false);

	env.editor.commands.addCommands([{
			name: "gotoline",
			bindKey: {win: "Ctrl-Return", mac: "Command-Return|Ctrl-Return"},
			exec: function(editor, line) {
			do_run();
			}
	}]);
	
	function escapeHTML(t) {
		return t.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	}
	function nl2br(t) {
		return t.replace(/\r\n|\r|\n/g, "<br />");
	}
	function setResultText(t, raw_html) {
		Titanium.API.info("set:" + t); 
		if (!raw_html) {
			t = '<textarea class="fullDark">' + escapeHTML(t) + '</textarea>';
		} else {
			//t = '<div class="halfWhite">' + t + '</div>'
			//	+ '<textarea class="halfDark" onclick="this.select()">' + escapeHTML(t) + '</textarea>';
			t = '<div class="fullWhite">' + t + '</div>'
				+ '<textarea id="bgLayer" class="fullDark" onclick="this.select()">' + escapeHTML(t) + '</textarea>';
		}
		$('result').innerHTML = t;
	}
	function onResize() {
		var dom_c = $('controls')
			, dom_r = $('result');
		var h = window.innerHeight
			, c_h = dom_c.style.display == "none" ? 0 : dom_c.clientHeight
			, r_h = dom_r.clientHeight;
		dom_r.style.height = h - c_h - 8 * 2 + "px";
		// console.log(h, c_h);
	}

	window.addEventListener('resize', onResize, false);
	window.addEventListener('load', onResize, false);
	var res = $('result');
	res.addEventListener('mouseover', function() {
		res.style.width = "98%";
		res.style.display = "fixed";
	}, false);
	res.addEventListener('mouseout', function() {
		res.style.width = "257px";
		res.style.display = "block";
	}, false);
	$('toggleMenu').addEventListener('click', function() {
		var dom_c = $('controls');
		dom_c.style.display = dom_c.style.display == "none" ? "block" : "none";
		onResize();
	});
	// window.resizeTo(1000,600)
}(function(id) { return document.getElementById(id); })
