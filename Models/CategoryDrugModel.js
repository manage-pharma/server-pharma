import mongoose from "mongoose";
const categoryDrugSchema = mongoose.Schema({
    name:{
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
const CategoryDrug = mongoose.model("CategoryDrug", categoryDrugSchema)
export default CategoryDrug