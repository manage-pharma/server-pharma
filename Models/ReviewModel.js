import mongoose from "mongoose";
const reviewSchema=mongoose.Schema({
    name: {
        type: String,
        require: true
    },
    rating: {
        type: Number,
        require: true
    },
    comment: {
        type: String,
        require: true
    },
    isActive: {
        type: Boolean,
        require: true,
        default: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'User'
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'Product'
    }
},{
    timestamps: true
}
)
const Review=mongoose.model("Review",reviewSchema)
export default Review
