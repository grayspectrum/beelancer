# Beelancer

Social Project Management For Busy Bees

## Getting Started

**Step 1:** Clone the respository to your workstation and navigate to the created directory:

```	
~# git clone git@github.com:gordonwritescode/beelancer.git && cd beelancer
```

**Step 2:** Install dependencies using Node Package Manager:

```
~# sudo npm install
```

**Step 3:** Install Wintersmith globally:

```
~# [sudo] npm install -g wintersmith
```

**Step 4:** Start the preview server:

If you want to run Beelancer against the hosted API, just run

```
~# wintersmith preview
```

If you are running a local instance of the Beelancer API (you are on the core team), 
edit the `locals` property in `./config-local.json` to match your local Beelancer 
API server instance, then run

```
~# wintersmith preview -c config-local.json
```

**Step 5:** Party!

## Building Beelancer

To output a static compiled build of Beelancer to the `./build` directory, just run:

```
~# cd path/to/beelancer && wintersmith build -c [path/to/config.json]
```

## License and Credit

Beelancer is developed by Gordon Hall (GordonWritesCode, Inc).

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

