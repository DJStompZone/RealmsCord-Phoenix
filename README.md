# RealmsCord-Phoenix
Connects your Minecraft Bedrock realm or server's game chat with a Discord channel using PrismarineJS's bedrock-protocol and discord.js

<p align="center">
  <img width="720" height="720" src="https://i.imgur.com/FJ4yR0P.png">
  <div style="display:flex;flex-direction:row">
   <p align="center">
     <img src="https://github.com/DJStompZone/realmscord-phoenix/actions/workflows/codeql.yml/badge.svg?branch=main"><span>&nbsp;</span><img src="https://github.com/DJStompZone/realmscord-phoenix/actions/workflows/dependency-review.yml/badge.svg"><span>&nbsp;</span><img src="https://img.shields.io/github/last-commit/djstompzone/realmscord-phoenix?style=flat&logo=github&logoColor=blue"></p>
  </div>
  <div style="display:flex;flex-direction:row">
  <p align="center">
     <img src="https://img.shields.io/github/license/djstompzone/realmscord-phoenix?color=blue&logoColor=blue&style=flat&logo=data:image/png;base64,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"><span>&nbsp;</span><img src="https://img.shields.io/github/package-json/v/djstompzone/realmscord-phoenix?logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABpAAAAaQBBTZdMgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAALTSURBVFiF7Zc7aBRRFIa%2Fc2cVMcYIRlEIpNCgksJCEETtLIR0YgLaue5kUcQHKknwtYrxUSgqiOwL1MIiQVBEsAg2aiP4fiAEREGNGkFiBB%2FZuccim7CvZCZxk0b%2FauacO%2Bf%2FLvfOmTvwr0vG9VRcqzF2C7A5G0ljzQWi8mViAeK6AGO3AxFgekH2F0oHIXOCsLwsL0BcV2F0O%2Bg6wPEZbUFuI%2FYckdCN8QPE1FDjNaC0gawIBFqsR6BneO9cISaZYABprcSzYYRdQO04jQvVAyQYMGfZKl9HBkh5e1D2A1VlMi5UHxDDdc4MBUxe2jIHqJwgc4BKlLm5geIlSGg9oodAG8vrLV1YaSEqD0sDJDJNqPOBqNwFIKmrwTsOsvLvjPUeOG24cgcYfKMcbz6RUGc%2BQNLLAA7ILZD9uPIAgFSmASvtCEvH5ssTjO4jErqZndAy0KOgawEP1wkVAmh%2BBelCZS%2FN8hhVIe2tB2lHqfOxfgsco8qkaRKPpC4BPQy6Ps%2FPdQQKN2H%2BFNYg9gFJ20GchURCnXimHogC70s80IvSyg%2BzCNdJ8I0akl4c7LPsfirZc0YBGMprI459QcpLMIV5uE6CflOH0AK8A94htNBvaml2TjKDuaS8BGq7gWZ8OucoS1BSv4GLWBMjKj15mbhW49g9KDuAab6V%2FJegpKYCzRjbTTKzaTiayoQx9g1KSyDzHI0VYEgVIKeH71RODcbGrvECAMwa4XrSAMqi%2FwC5AN4k%2Bg575QDI9UmzF7lWDFAlG1B2Ar0TaP0Z2MFM2TjMUjTkslbw025DaMPvZJTtZgG66HeE83jmOFHpy02MfCi9pLMZsHtHba3%2BAIOtG3MQVz6VGuB%2FLE9qDdgDQBgIBQSwIFdxpJWwvB6tfPAfk7guxuiRvO96SQDpAtmNK0%2BDlA35D8kqKq%2BAJlK6HNV20Hk52ecgHxHZR0TuB675X8Af8jrvERKXqC0AAAAASUVORK5CYII%3D&logoColor=blue&style=flat"><span>&nbsp;</span><img src="https://img.shields.io/github/languages/code-size/djstompzone/realmscord-phoenix?logo=github&logoColor=blue&style=flat"><span>&nbsp;</span><img src="https://img.shields.io/github/package-json/dependency-version/djstompzone/realmscord-phoenix/bedrock-protocol?logo=data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAABpAAAAaQBBTZdMgAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAALTSURBVFiF7Zc7aBRRFIa%2Fc2cVMcYIRlEIpNCgksJCEETtLIR0YgLaue5kUcQHKknwtYrxUSgqiOwL1MIiQVBEsAg2aiP4fiAEREGNGkFiBB%2FZuccim7CvZCZxk0b%2FauacO%2Bf%2FLvfOmTvwr0vG9VRcqzF2C7A5G0ljzQWi8mViAeK6AGO3AxFgekH2F0oHIXOCsLwsL0BcV2F0O%2Bg6wPEZbUFuI%2FYckdCN8QPE1FDjNaC0gawIBFqsR6BneO9cISaZYABprcSzYYRdQO04jQvVAyQYMGfZKl9HBkh5e1D2A1VlMi5UHxDDdc4MBUxe2jIHqJwgc4BKlLm5geIlSGg9oodAG8vrLV1YaSEqD0sDJDJNqPOBqNwFIKmrwTsOsvLvjPUeOG24cgcYfKMcbz6RUGc%2BQNLLAA7ILZD9uPIAgFSmASvtCEvH5ssTjO4jErqZndAy0KOgawEP1wkVAmh%2BBelCZS%2FN8hhVIe2tB2lHqfOxfgsco8qkaRKPpC4BPQy6Ps%2FPdQQKN2H%2BFNYg9gFJ20GchURCnXimHogC70s80IvSyg%2BzCNdJ8I0akl4c7LPsfirZc0YBGMprI459QcpLMIV5uE6CflOH0AK8A94htNBvaml2TjKDuaS8BGq7gWZ8OucoS1BSv4GLWBMjKj15mbhW49g9KDuAab6V%2FJegpKYCzRjbTTKzaTiayoQx9g1KSyDzHI0VYEgVIKeH71RODcbGrvECAMwa4XrSAMqi%2FwC5AN4k%2Bg575QDI9UmzF7lWDFAlG1B2Ar0TaP0Z2MFM2TjMUjTkslbw025DaMPvZJTtZgG66HeE83jmOFHpy02MfCi9pLMZsHtHba3%2BAIOtG3MQVz6VGuB%2FLE9qDdgDQBgIBQSwIFdxpJWwvB6tfPAfk7guxuiRvO96SQDpAtmNK0%2BDlA35D8kqKq%2BAJlK6HNV20Hk52ecgHxHZR0TuB675X8Af8jrvERKXqC0AAAAASUVORK5CYII%3D&style=flat"></p>  
  <p align="center">
    <a href="https://gitpod.io/#https://github.com/DJStompZone/RealmsCord-Phoenix"><img src="https://gitpod.io/button/open-in-gitpod.svg"></a>
  </p>
  <p align="center">
    <a href="https://discord.io/stomp"><img src="https://img.shields.io/discord/599808270655291403?color=blue&label=Discord&logo=discord&logoColor=blue&style=flat"></a>
  </p>
  </div>
</p>
