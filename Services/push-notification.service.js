import {ONE_SIGNAL_CONFIG} from '../config/app.config.js'
import https from 'https'
async function SendNotification(data){
    var headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization" : "Basic " + ONE_SIGNAL_CONFIG.API_KEY
    }
    var options = {
        host: "onesignal.com",
        port: 443,
        path: "/api/v1/notifications",
        method: "POST",
        headers 
    }
    var req = https.request(options)
    req.on('error', function(e){
      console.log(e)
  })
    req.write(JSON.stringify(data))
    req.end()
}

function ConfigNotify({contents, bigPicture,headings }){
    var message = {
      app_id: ONE_SIGNAL_CONFIG.APP_ID,
      contents: { en: contents },
      included_segments: ["All"],
      content_available: true,
      small_icon: "ic_notification_icon",
      data: {
        PushTitle: "Custom Notification"
      },
      name: 'INTERNAL_CAMPAIGN_NAME',
      big_picture: bigPicture,
      headings: {
        en: headings
      },
    }
  
    SendNotification(message)
  }
export {
    SendNotification,
    ConfigNotify
}