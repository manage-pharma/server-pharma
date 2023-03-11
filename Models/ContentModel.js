import mongoose from "mongoose";
const contentSchema = mongoose.Schema({
    logo:{
        type: String,
        require: true   
    },
    phone:{
        type: String,
        require: true
    },
    banners:{
        type: Array,
        require: true
    },
    companyName:{
        type: String,
        require: true,
        
    },
    companyAddress:{
        type: String,
        require: true,
        
    },
    links:{
        type: Array,
        require: true
    },
    contacts:{
        type: Array,
        require: true
    },
    zaloUrl:{
        type: String,
        require: true
    },
    fbUrl:{
        type: String,
        require: true
    },
    qrCode:{
        type: String,
        require: true
    }
    
},{
    timestamps: true
}
)
const Content = mongoose.model("Content", contentSchema)
export default Content