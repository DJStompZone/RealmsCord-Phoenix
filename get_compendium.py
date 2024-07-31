import os, json
from subprocess import run as sh
from time import sleep
from tqdm import tqdm

path_includes = lambda search: any([search in entry for entry in [*[os.path.realpath(each) for each in os.listdir()], os.getcwd()]])

compendium = []
with open('full_compendium.json', 'r') as fp:
    compendium = json.loads(fp.read())
progress_bar = tqdm(total=len(compendium), unit="downloads", desc="fetching emoji resources", smoothing=0.7)

def wget(emoji):
    if os.name == 'nt':
        return os.system(f"curl.exe --silent -o {emoji['code']}.png {emoji['url']}")
    else:
        return os.system(f"curl --silent -o {emoji['code']}.png {emoji['url']}")
    sleep(0.5)

def runmain():
    if not path_includes(os.getcwd()+os.path.sep+"compendium"):
        os.mkdir("compendium")
        os.chdir("compendium")
    for emoji in compendium:
        progress_bar.update(1)
        try:
          wget(emoji)
        except Exception as e:
          print(e)
        sleep(0.5)

if __name__ == "__main__":
     runmain()
        
   