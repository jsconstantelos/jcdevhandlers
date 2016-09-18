definition(
    name: "Virtual Temp Device",
    singleInstance: true,
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Virtual Temp Device",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    page(name: "mainPage", title: "Virtual Temp Devices", install: true, uninstall: true,submitOnChange: true) {
            section {
                    app(name: "childRules", appName: "Virtual Temp Device Child", namespace: "jscgs350", title: "Create Virtual Temp Device...", multiple: true)
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
            log.info "Installed Virtual Devices: ${child.label}"
    }
}