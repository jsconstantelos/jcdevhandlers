definition(
    name: "Dashboard - Lights, Switches, and Outlets",
    singleInstance: true,
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Dashboard - Lights, Switches, and Outlets",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    page(name: "mainPage", title: "Dashboard - Lights, Switches, and Outlets", install: true, uninstall: true,submitOnChange: true) {
            section {
                    app(name: "childRules", appName: "Dashboard - Lights, Switches, and Outlets Child", namespace: "jscgs350", title: "Create a new dashboard...", multiple: true)
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
            log.info "Installed Dashboards: ${child.label}"
    }
}