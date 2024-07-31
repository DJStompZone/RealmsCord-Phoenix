import os, time
import argparse

parser = argparse.ArgumentParser(description='Examine the running instance of the bot, and restart if needed')
parser.add_argument('--logfile', dest='logfile', action='store_true', default=True, help='Enable logging to file')
parser.add_argument('--printlogs', dest='printlogs', action='store_true', default=True, help='Enable logging to console')
parser.add_argument('--force', dest='force', action='store_true', default=False, help='Force restart')
args = parser.parse_args()


def _print_(message, nolog=False):
    formatted = f'[phoenix_recover] [{time.strftime("[%m/%d/%y %H:%M:%S]")}] {message}'
    if args.printlogs:
        print(formatted)
    if args.logfile and not nolog:
        os.system(f'echo "{formatted}" >> ./phoenix_recover.log')

def fetch_tail(n):
    os.system(f'tail -n {n} ~/.pm2/logs/phoenix-out.log > pm2log.tmp.txt')
    
def runchecks():
    _print_("=== Bot auto recovery script running... ===")
    lines = []
    fetch_tail(2)
    with open('pm2log.tmp.txt') as fp:
        lines = fp.readlines()
    if args.force or 'Server requested disconnect' in ''.join(lines) or "Connected to Discord as" in ''.join(lines) or "setting activity..." in ''.join(lines):
        _print_("Detected disconnect, attempting recovery..." if not args.force else "--force flag present, restarting...")
        os.system('npx pm2 stop phoenix')
        time.sleep(5)
        os.system('npx pm2 restart phoenix')
        _print_("Sleeping, 20 seconds remaining...", nolog=True)
        time.sleep(10)
        _print_("Sleeping, 10 seconds remaining...", nolog=True)
        time.sleep(10)
        _print_("Validating recovery outcome...", nolog=True)
        lastline = ""
        fetch_tail(2)
        with open('pm2log.tmp.txt') as fp:
            lastline = fp.read()
        if "Activity set.Connected to Discord as" in lastline or "Server requested disconnect" in lastline:
            _print_("Bot hang detected, trying to re-restart...")
            os.system('npx pm2 stop phoenix')
            _print_("Phoenix halted.\nSleeping for 15s...")
            time.sleep(15)
            _print_("Restarting phoenix...")
            os.system('npx pm2 restart phoenix')
        else:
            _print_("1st recovery attempt successful")
        time.sleep(15)
        _print_("Recovery (hopefully) successful!")
    else:
        _print_("Checking bot.... No problems detected")
    _print_("EOF, Exiting!", nolog=True)

if __name__ == "__main__":
    runchecks()
