import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  password: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  name?: string;
  phone?: string;
  address?: string;
  profileImage?: string;
  birthday?: Date;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String },
  name: { type: String },
  phone: { type: String },
  address: { type: String },
  profileImage: { type: String },
  birthday: { type: Date },
});

export default mongoose.model<IUser>('User', userSchema);
