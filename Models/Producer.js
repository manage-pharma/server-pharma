import mongoose from "mongoose";
const producerSchema = mongoose.Schema({
    name:{
        type: String,
        require: true   
    },
    isActive:{
        type: Boolean,
        require: true,
        default: true
    },
    user:{
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'User'
    }
},{
    timestamps: true
}
)
const Producer = mongoose.model("Producer", producerSchema)
export default Producer