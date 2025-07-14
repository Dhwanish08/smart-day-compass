import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { firebaseApp } from "@/firebaseConfig";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";

declare global {
  interface Window {
    recaptchaVerifier?: any;
  }
}

interface ProfileData {
  username: string;
  emailVerified: boolean;
  // Add these fields to your backend for full functionality
  name?: string;
  phone?: string;
  address?: string;
  profileImage?: string;
}

export default function Profile() {
  const { token, logout } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Add state for cropping modal
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Add state for image upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          // Token invalid/expired: log out and redirect
          logout();
          toast({ title: "Session expired", description: "Please log in again.", variant: "destructive" });
          window.location.href = "/login?message=Session%20expired";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setEmail(data.username);
          setName(data.name || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");
          setProfileImage(data.profileImage);
        } else {
          const errorData = await res.json();
          toast({ title: "Failed to load profile", description: errorData.message, variant: "destructive" });
        }
      } catch (error) {
        toast({ title: "Connection error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [token, toast, logout, API_URL]);

  useEffect(() => {
    return () => {
      window.recaptchaVerifier = undefined;
    };
  }, []);

  // Handle file selection and open crop modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSelectedImage(e.target.files[0]);
    setCropModalOpen(true);
  };

  // Get cropped image as blob
  async function getCroppedImg(imageSrc: string, crop: any) {
    const createImage = (url: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", error => reject(error));
        image.setAttribute("crossOrigin", "anonymous");
        image.src = url;
      });
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas is empty"));
      }, "image/jpeg");
    });
  }

  // Handle crop complete
  const onCropComplete = (_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  };

  // Handle crop save/upload
  const handleCropSave = async () => {
    if (!selectedImage || !croppedAreaPixels) return;
    setUploadingImage(true);
    try {
      const imageDataUrl = URL.createObjectURL(selectedImage);
      const croppedBlob = await getCroppedImg(imageDataUrl, croppedAreaPixels);
      const formData = new FormData();
      formData.append("image", croppedBlob, selectedImage.name);
      const res = await fetch(`${API_URL}/auth/profile/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      } as any);
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setProfileImage(data.imageUrl);
        toast({ title: "Profile image updated!" });
        setCropModalOpen(false);
      } else {
        toast({ title: "Upload failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setUploadingImage(false);
      setSelectedImage(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, phone, address }),
      });
      if (res.ok) {
        toast({ title: "Profile updated!" });
      } else {
        const data = await res.json();
        toast({ title: "Update failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Account deleted. Goodbye!" });
        logout();
      } else {
        const data = await res.json();
        toast({ title: "Delete failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center">No profile data.</div>;

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <Link to="/">
          <Button className="shadow-md px-6 py-2 rounded-lg font-semibold bg-white text-primary border border-[#dde1e3] hover:bg-[#f1f2f4] transition-colors">
            Dashboard
          </Button>
        </Link>
      </div>
      <main className="px-4 md:px-40 flex flex-1 justify-center py-5">
        <form onSubmit={handleUpdate} className="flex flex-col w-full max-w-[512px] bg-white rounded-xl shadow p-5 gap-4">
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="relative group rounded-full size-24 bg-[#f1f2f4] flex items-center justify-center overflow-hidden">
              <img
                src={profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=4f46e5&color=fff&size=128`}
                alt="Profile avatar"
                className="w-24 h-24 rounded-full object-cover"
              />
              <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                <Pencil className="w-7 h-7 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploadingImage}
                />
              </label>
              {uploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <span className="text-white text-xs">Uploading...</span>
                </div>
              )}
            </div>
            <Button type="button" variant="secondary" className="mt-2" onClick={logout}>
              Logout
            </Button>
          </div>
          <div className="flex flex-wrap justify-between gap-3 p-4">
            <div className="flex min-w-72 flex-col gap-3">
              <p className="text-[#121416] text-[32px] font-bold leading-tight">Profile</p>
              <p className="text-[#6a7681] text-sm font-normal leading-normal">Manage your account settings</p>
            </div>
          </div>
          <h3 className="text-[#121416] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Basic Info</h3>
          <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#121416] text-base font-medium leading-normal pb-2">Name</p>
              <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#121416] focus:outline-0 focus:ring-0 border border-[#dde1e3] bg-white focus:border-[#dde1e3] h-14 placeholder:text-[#6a7681] p-[15px] text-base font-normal leading-normal" value={name} onChange={e => setName(e.target.value)} />
            </label>
          </div>
          <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#121416] text-base font-medium leading-normal pb-2">Phone</p>
              <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#121416] focus:outline-0 focus:ring-0 border border-[#dde1e3] bg-white focus:border-[#dde1e3] h-14 placeholder:text-[#6a7681] p-[15px] text-base font-normal leading-normal" value={phone} onChange={e => setPhone(e.target.value)} />
            </label>
          </div>
          <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#121416] text-base font-medium leading-normal pb-2">Address</p>
              <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#121416] focus:outline-0 focus:ring-0 border border-[#dde1e3] bg-white focus:border-[#dde1e3] h-14 placeholder:text-[#6a7681] p-[15px] text-base font-normal leading-normal" value={address} onChange={e => setAddress(e.target.value)} />
            </label>
          </div>
          <h3 className="text-[#121416] text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Security</h3>
          <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#121416] text-base font-medium leading-normal pb-2">Email</p>
              <input className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#121416] focus:outline-0 focus:ring-0 border border-[#dde1e3] bg-white focus:border-[#dde1e3] h-14 placeholder:text-[#6a7681] p-[15px] text-base font-normal leading-normal" value={email} onChange={e => setEmail(e.target.value)} />
              <span className="text-xs mt-1">Verified: {profile.emailVerified ? "✅" : "❌"}</span>
            </label>
          </div>
          <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
            <label className="flex flex-col min-w-40 flex-1">
              <p className="text-[#121416] text-base font-medium leading-normal pb-2">Password</p>
              <input type="password" className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#121416] focus:outline-0 focus:ring-0 border border-[#dde1e3] bg-white focus:border-[#dde1e3] h-14 placeholder:text-[#6a7681] p-[15px] text-base font-normal leading-normal" value={password} onChange={e => setPassword(e.target.value)} />
            </label>
          </div>
          <div className="flex px-4 py-3 justify-end">
            <Button type="submit" className="min-w-[84px] max-w-[480px] h-10 px-4 bg-[#dce8f3] text-[#121416] text-sm font-bold" disabled={updating}>
              {updating ? "Updating..." : "Update Profile"}
            </Button>
          </div>
          <div className="flex px-4 py-3 justify-end">
            <Button type="button" variant="destructive" className="min-w-[84px] max-w-[480px] h-10 px-4 text-sm font-bold" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </form>
      </main>
      {/* Cropping Modal */}
      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Crop your profile image</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-72 bg-gray-100">
              <Cropper
                image={URL.createObjectURL(selectedImage)}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setCropModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCropSave} disabled={uploadingImage}>
              {uploadingImage ? "Uploading..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 