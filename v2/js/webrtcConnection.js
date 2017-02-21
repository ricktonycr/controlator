RTC = (function(){
	var ws;
	var me;
	var other;
	var peerConnection;
	var dataChannel;
	var websocketServer;
	var websocketKey;
	var funcMessage;


	function showMessage(e){
		funcMessage(e.data);
	}

	function createRTC(config){
		if('RTCPeerConection' in window){
			return new RTCPeerConection(config);
		}else if('webkitRTCPeerConnection' in window){
			return new webkitRTCPeerConnection(config);
		}else if('mozRTCPeerConnection' in window){
			return new mozRTCPeerConnection(config);
		}
	}


	function openDataChannel (){
		var config = {"iceServers":[{"url":"stun:stun.l.google.com:19302"}]};
		//var connection = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };

		peerConnection = createRTC(config);
		peerConnection.onicecandidate = function(e){
			if (!peerConnection || !e || !e.candidate) return;
			var candidate = e.candidate;
			candidate = candidate.toJSON();
			candidate.type = 'candidate';
			sendNegotiation("candidate", candidate);
		}

		dataChannel = peerConnection.createDataChannel("datachannel");
		dataChannel.onmessage = showMessage;
		dataChannel.onopen = function(){
			console.log("------ DATACHANNEL OPENED ------");
			ws.close();
		};
		dataChannel.onclose = function(){
			console.log("------ DC CLOSED ------");
		};
		dataChannel.onerror = function(){
			console.log("DC ERROR!!!");
		};
		peerConnection.ondatachannel = function (event){
			event.channel.onmessage = showMessage;
		};
	}

	function sendAnswer(){
		var sdpConstraints = {'mandatory':
			{
				'OfferToReceiveAudio': false,
				'OfferToReceiveVideo': false
			}
		};

		peerConnection.createAnswer(function (sdp) {
			peerConnection.setLocalDescription(sdp);
			sendNegotiation("answer", sdp);
			console.log("------ SEND ANSWER ------");
  		}, function(){}, sdpConstraints);
	}

	function sendOffer(){
		var sdpConstraints = {'mandatory':
			{
				'OfferToReceiveAudio': false,
				'OfferToReceiveVideo': false
			}
		};

		peerConnection.createOffer(function (sdp) {
			peerConnection.setLocalDescription(sdp);
			sendNegotiation("offer", sdp);
			console.log("------ SEND OFFER ------");
		}, function(){}, sdpConstraints);
	}

	function processIce(iceCandidate){
		peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
		console.log("------ PROCESSED ICE ------");
	}

	function processAnswer(answer){
		peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
		console.log("------ PROCESSED ANSWER ------");
	}

	function processOffer(answer){
		peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
		console.log("------ PROCESSED OFFER ------");
	}

	function sendNegotiation(type, sdp){
		var json = { from: me, to: other, action: type, data: sdp};
		ws.send(JSON.stringify(json));
		console.log("Sending ["+me+"] to ["+other+"]: " + JSON.stringify(sdp));
	}


	function initWebSocket(){
		ws = new WebSocket(websocketServer,websocketKey);
		
		ws.onopen = function(e){    
			console.log("Websocket opened");
		}
		ws.onclose = function(e){   
			console.log("Websocket closed");
		}
		ws.onmessage = function(e){ 
			console.log("Websocket message received: " + e.data);
			var json = JSON.parse(e.data);

			if(json.action == "candidate"){
				if(json.to == me){
					processIce(json.data);
				}
			} else if(json.action == "offer"){
				// incoming offer
				if(json.to == me){
					processOffer(json.data);
					sendAnswer();
				}
			} else if(json.action == "answer"){
				// incoming answer
				if(json.to == me){
					processAnswer(json.data);
				}
			}
		}
	}

	return {
		init:function(myName,otherName,wsServer,wsKey,fM){
			try{
				funcMessage = fM;
				me = myName;
				other = otherName;
				websocketServer = wsServer;
				websocketKey = wsKey;
				initWebSocket();
			}catch(error){
				alert("error");
			}
		},
		openConnection:function(){
			openDataChannel();
			if(me == "control")
				sendOffer();
		},
		sendMessage:function(value){
			dataChannel.send(value);
		}
	}
})();