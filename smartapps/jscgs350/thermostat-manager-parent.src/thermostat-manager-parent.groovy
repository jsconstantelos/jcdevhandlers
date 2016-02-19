definition(
    name: "Thermostat Manager Parent",
    singleInstance: true,
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Thermostat Manager Parent",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    page(name: "mainPage", title: "Thermostat Manager Parent", install: true, uninstall: true,submitOnChange: true) {
            section {
                    app(name: "childRules", appName: "Thermostat Manager Child", namespace: "jscgs350", title: "Create a Thermostat Manager...", multiple: true)
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
            log.info "Installed Thermostat Managers: ${child.label}"
    }
}