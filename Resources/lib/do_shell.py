#!/usr/bin/env python

import subprocess
import os

def do_shell(cmdline, stdin_str = None):
  p = subprocess.Popen(cmdline, shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
  (stdout, stdin) = (p.stdout, p.stdin)
  if stdin_str is not None:
    stdin.write(stdin_str)
    stdin.close()
  
  lines = []
  while True:
    line = stdout.readline()
    if line == '':
      break
    lines.append(line)
  return "".join(lines)

