import mongoose from "mongoose";
const categorySchema = mongoose.Schema({
    name:{
        type: String,
        require: true   
    },
    image:{
        type: String,
        require: true
    },
    description:{
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
const Category = mongoose.model("Category", categorySchema)
export default Category