definition(
    name: "Dashboard - Battery Monitor Parent",
    singleInstance: true,
    namespace: "jscgs350",
    author: "jscgs350",
    description: "Dashboard - Battery Monitor Parent",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    page(name: "mainPage", title: "Dashboard - Battery Monitor Parent", install: true, uninstall: true,submitOnChange: true) {
            section {
                    app(name: "childRules", appName: "Dashboard - Battery Monitor Child", namespace: "jscgs350", title: "Create Battery Monitor...", multiple: true)
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