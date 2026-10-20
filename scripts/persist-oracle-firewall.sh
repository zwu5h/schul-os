#!/usr/bin/env bash
set -euo pipefail

sudo python3 - <<'PY'
from pathlib import Path

path = Path('/etc/iptables/rules.v4')
text = path.read_text()
anchor = '-A INPUT -j REJECT --reject-with icmp-host-prohibited\n'
rules = (
    '-A INPUT -p tcp -m tcp --dport 80 -j ACCEPT\n'
    '-A INPUT -p tcp -m tcp --dport 443 -j ACCEPT\n'
)
if anchor not in text:
    raise SystemExit('Oracle INPUT reject rule not found; firewall file unchanged')
if '--dport 80 -j ACCEPT' not in text and '--dport 443 -j ACCEPT' not in text:
    path.write_text(text.replace(anchor, rules + anchor, 1))
elif not ('--dport 80 -j ACCEPT' in text and '--dport 443 -j ACCEPT' in text):
    raise SystemExit('Only one web port exists; inspect firewall manually')
PY

sudo grep -E 'dport (22|80|443)|INPUT -j REJECT' /etc/iptables/rules.v4
