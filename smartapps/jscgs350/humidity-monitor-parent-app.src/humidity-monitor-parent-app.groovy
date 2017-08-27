definition(
    name: "Humidity Monitor Parent App",
    singleInstance: true,
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Humidity Monitor Parent App",
    category: "My Apps",
    iconUrl: "https://graph.api.smartthings.com/api/devices/icons/st.Weather.weather9-icn",
    iconX2Url: "https://graph.api.smartthings.com/api/devices/icons/st.Weather.weather9-icn?displaySize=2x")

preferences {
    page(name: "mainPage", title: "Humidity Monitor Parent App", install: true, uninstall: true,submitOnChange: true) {
            section {
                    app(name: "childRules", appName: "Humidity Monitor Child App", namespace: "jscgs350", title: "Create Humidity Monitor...", multiple: true)
            }
    }
}

def installed() {
    initialize()
}

def updated() {
    unsubscribe()
    initialize()
}

def initialize() {
    childApps.each {child ->
            log.info "Installed Monitors: ${child.label}"
    }
}