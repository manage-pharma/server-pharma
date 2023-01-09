import mongoose from 'mongoose'
// const reviewSchema = mongoose.Schema({
//     name:{
//         type: String,
//         require: true   
//     },
//     rating:{
//         type: Number,
//         require: true,
//     },
//     comment:{
//         type: String,
//         require: true   
//     },
//     user:{
//         type: mongoose.Schema.Types.ObjectId,
//         require: true,
//         ref: 'User'
//     }
// })
const productSchema = mongoose.Schema({
    category:{
        type: mongoose.Schema.Types.ObjectId,
        require: true,
        ref: 'Category'
    },
    categoryDrug:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryDrug'
    },
    name:{
        type: String,
        require: true   
    },
    description:{
        type: String,
        require: true
    },
    image:{
        type: String,
        require: true,
    },
    unit: {
        type: String,
        require: true
    },
    regisId:{
        type: String,
        require: true
    },
    price:{
        type: Number,
        require: true,
        default: 0
    },
    countInStock:{
        type: Number,
        default: 0
    },
    expDrug:{
        type: Date,
        require: true
    },
    statusDrug:{
        type: Boolean,
        default: true
    }
    // rating:{
    //     type: Number,
    //     require: true,
    //     default: 0
    // },
    // numberReviews:{
    //     type: Number,
    //     require: true,
    //     default: 0
    // },
    // reviews: [reviewSchema]

},{
    timestamps: true
}
)
const Product = mongoose.model("Product", productSchema)
export default Product