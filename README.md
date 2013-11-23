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

If you are running a local instance of the Beelancer API, edit the `locals` property
in `./config-localdev.json` to match your local Beelancer API server instance, then run

```
~# wintersmith preview -c config-localdev.json
```

**Step 5:** Party!

## Building Beelancer

To output a static compiled build of Beelancer to the `./build` directory, just run:

```
~# cd path/to/beelancer && wintersmith build -c [path/to/config.json]
```
