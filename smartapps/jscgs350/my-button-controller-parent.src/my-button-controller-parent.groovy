definition(
    name: "My Button Controller Parent",
    singleInstance: true,
    namespace: "jscgs350",
    author: "jscgs350",
    description: "My Button Controller Parent",
    category: "My Apps",
    iconUrl: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience.png",
    iconX2Url: "https://s3.amazonaws.com/smartapp-icons/Convenience/Cat-Convenience@2x.png")

preferences {
    page(name: "mainPage", title: "My Button Controller", install: true, uninstall: true,submitOnChange: true) {
            section {
                    app(name: "childRules", appName: "My Button Controller Child", namespace: "jscgs350", title: "Create a button controller...", multiple: true)
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
            log.info "Installed My Button Controller Child: ${child.label}"
    }
}