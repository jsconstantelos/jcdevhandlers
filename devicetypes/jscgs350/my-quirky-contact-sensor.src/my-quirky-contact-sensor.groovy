/**
 *  Quirky/Wink Tripper Contact Sensor
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License. You may obtain a copy of the License at:
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the License is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License
 *  for the specific language governing permissions and limitations under the License.
 *
 *  Version: v2
 *
 *  Updates:
 *  -------
 *  02-18-2016 : Initial commit
 *  03-11-2016 : Due to ST's v2.1.0 app totally hosing up SECONDARY_CONTROL, implemented a workaround to display that info in a separate tile.
 *
 */

metadata {
	definition (name: "My Quirky Contact Sensor", namespace: "jscgs350", author: "Mitch Pond") {
    
		capability "Contact Sensor"
		capability "Battery"
		capability "Configuration"
		capability "Sensor"
    
		attribute "tamper", "string"
    
		command "configure"
		command "resetTamper"

        fingerprint inClusters: "0000,0001,0003,0500,0020,0B05", outClusters: "0003,0019"
	}

	// UI tile definitions
	tiles(scale: 2) {
		multiAttributeTile(name:"contact", type: "lighting", width: 6, height: 4){
			tileAttribute ("device.contact", key: "PRIMARY_CONTROL") {
				attributeState "closed", label: "CLOSED", icon: "st.contact.contact.closed", backgroundColor: "#79b821"
				attributeState "open", label: "OPEN", icon: "st.contact.contact.open", backgroundColor: "#ffa81e"
			}
/*            tileAttribute ("statusText", key: "SECONDARY_CONTROL") {
           		attributeState "statusText", label:'${currentValue}'       		
            } */
		}        
		valueTile("battery", "device.battery", width: 3, height: 2, inactiveLabel: false, decoration: "flat") {
			state "battery", label:'${currentValue}% battery', unit:""
		}
        valueTile("statusText", "statusText", inactiveLabel: false, width: 2, height: 2) {
			state "statusText", label:'${currentValue}', backgroundColor:"#ffffff"
		}        
		standardTile("tamper", "device.tamper", width: 3, height: 2) {
			state "OK", label: "OK", icon: "st.security.alarm.on", backgroundColor:"#79b821", decoration: "flat"
			state "tampered", label: "Tampered", action: "resetTamper", icon: "st.security.alarm.off", backgroundColor:"#ffa81e", decoration: "flat"
		}
        
		main ("contact")
		details(["contact","battery","tamper"])
	}
}

// Parse incoming device messages to generate events
def parse(String description) {
	//log.debug "description: $description"

	def results = []
	if (description?.startsWith('catchall:')) {
		results = parseCatchAllMessage(description)
	}
	else if (description?.startsWith('read attr -')) {
		results = parseReportAttributeMessage(description)
	}
	else if (description?.startsWith('zone status')) {
		results = parseIasMessage(description)
	}

//	log.debug "Parse returned $results"

	if (description?.startsWith('enroll request')) {
		List cmds = enrollResponse()
		log.debug "enroll response: ${cmds}"
		results = cmds?.collect { new physicalgraph.device.HubAction(it) }
	}
   
	return results
}

//Initializes device and sets up reporting
def configure() {
	String zigbeeId = swapEndianHex(device.hub.zigbeeId)
	log.debug "Confuguring Reporting, IAS CIE, and Bindings."
    
	def cmd = [
		"zcl global write 0x500 0x10 0xf0 {${zigbeeId}}", "delay 200",
		"send 0x${device.deviceNetworkId} 1 1", "delay 1500",
	
		"zcl global send-me-a-report 0x500 0x0012 0x19 0 0xFF {}", "delay 200", //get notified on tamper
		"send 0x${device.deviceNetworkId} 1 1", "delay 1500",
		
		"zcl global send-me-a-report 1 0x20 0x20 5 3600 {}", "delay 200", //battery report request
		"send 0x${device.deviceNetworkId} 1 1", "delay 1500",
	
		"zdo bind 0x${device.deviceNetworkId} 1 1 0x500 {${device.zigbeeId}} {}", "delay 500",
		"zdo bind 0x${device.deviceNetworkId} 1 1 1 {${device.zigbeeId}} {}", "delay 500",
		"st rattr 0x${device.deviceNetworkId} 1 1 0x20"
		]
	cmd
}

//Sends IAS Zone Enroll response
def enrollResponse() {
	log.debug "Sending enroll response"
	[	
	"raw 0x500 {01 23 00 00 00}", "delay 200",
	"send 0x${device.deviceNetworkId} 1 1"
	]
}

private Map parseCatchAllMessage(String description) {
 	def results = [:]
 	def cluster = zigbee.parse(description)
 	if (shouldProcessMessage(cluster)) {
		switch(cluster.clusterId) {
			case 0x0001:
				log.debug "Received a catchall message for battery status. This should not happen."
				results << createEvent(getBatteryResult(cluster.data.last()))
				break
            }
        }

	return results
}

private boolean shouldProcessMessage(cluster) {
	// 0x0B is default response indicating message got through
	// 0x07 is bind message
	boolean ignoredMessage = cluster.profileId != 0x0104 || 
		cluster.command == 0x0B ||
		cluster.command == 0x07 ||
		(cluster.data.size() > 0 && cluster.data.first() == 0x3e)
	return !ignoredMessage
}

private parseReportAttributeMessage(String description) {
	Map descMap = (description - "read attr - ").split(",").inject([:]) { map, param ->
		def nameAndValue = param.split(":")
		map += [(nameAndValue[0].trim()):nameAndValue[1].trim()]
	}
	//log.debug "Desc Map: $descMap"

	def results = []
    
	if (descMap.cluster == "0001" && descMap.attrId == "0020") {
		log.debug "Received battery level report"
		results = createEvent(getBatteryResult(Integer.parseInt(descMap.value, 16)))
	}

	return results
}

private parseIasMessage(String description) {
	List parsedMsg = description.split(' ')
	String msgCode = parsedMsg[2]
	int status = Integer.decode(msgCode)
	def linkText = getLinkText(device)

	def results = []
	//log.debug(description)
	if (status & 0b00000001) {results << createEvent(getContactResult('open'))}
	else if (~status & 0b00000001) results << createEvent(getContactResult('closed'))

	if (status & 0b00000100) {
    		//log.debug "Tampered"
            results << createEvent([name: "tamper", value:"tampered"])
	}
	else if (~status & 0b00000100) {
		//don't reset the status here as we want to force a manual reset
		//log.debug "Not tampered"
		//results << createEvent([name: "tamper", value:"OK"])
	}
	
	if (status & 0b00001000) {
		//battery reporting seems unreliable with these devices. However, they do report when low.
		//Just in case the battery level reporting has stopped working, we'll at least catch the low battery warning.
		//
		//** Commented this out as this is currently conflicting with the battery level report **/
		//log.debug "${linkText} reports low battery!"
		//results << createEvent([name: "battery", value: 10])
	}
	else if (~status & 0b00001000) {
		//log.debug "${linkText} battery OK"
	}
	//log.debug results
	return results
}

//Converts the battery level response into a percentage to display in ST
//and creates appropriate message for given level
//**real-world testing with this device shows that 2.4v is about as low as it can go **/

private getBatteryResult(rawValue) {
	def linkText = getLinkText(device)

	def result = [name: 'battery']

	def volts = rawValue / 10
	def descriptionText
	if (volts > 3.5) {
		result.descriptionText = "${linkText} battery has too much power (${volts} volts)."
	}
	else {
		def minVolts = 2.4
		def maxVolts = 3.0
		def pct = (volts - minVolts) / (maxVolts - minVolts)
		result.value = Math.min(100, (int) pct * 100)
		result.descriptionText = "${linkText} battery was ${result.value}%"
	}

	return result
}


private Map getContactResult(value) {
	def linkText = getLinkText(device)
	def descriptionText = "${linkText} was ${value == 'open' ? 'opened' : 'closed'}"
	return [
		name: 'contact',
		value: value,
		descriptionText: descriptionText
		]
}

//Resets the tamper switch state
private resetTamper(){
	log.debug "Tamper alarm reset."
	sendEvent([name: "tamper", value:"OK"])
}

private hex(value) {
	new BigInteger(Math.round(value).toString()).toString(16)
}

private String swapEndianHex(String hex) {
	reverseArray(hex.decodeHex()).encodeHex()
}

private byte[] reverseArray(byte[] array) {
	int i = 0;
	int j = array.length - 1;
	byte tmp;
	while (j > i) {
		tmp = array[j];
		array[j] = array[i];
		array[i] = tmp;
		j--;
		i++;
	}
	return array
}