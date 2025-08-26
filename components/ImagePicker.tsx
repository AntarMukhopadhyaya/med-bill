import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToastHelpers } from "@/lib/toast";
import { colors, spacing } from "@/components/DesignSystem";
import { z } from "zod";

// Validation schemas
const ImageUploadSchema = z.object({
  uri: z.string().min(1, "Image URI is required"),
  type: z.string().min(1, "Image type is required"),
  fileName: z.string().min(1, "File name is required"),
});

const ImagePickerConfigSchema = z.object({
  bucket: z.string().min(1, "Bucket name is required"),
  folder: z.string().optional(),
  maxSizeBytes: z
    .number()
    .positive()
    .optional()
    .default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z
    .array(z.string())
    .optional()
    .default(["image/jpeg", "image/png", "image/webp"]),
});

interface ImagePickerProps {
  /** Current image URL to display */
  imageUrl?: string | null;
  /** Callback when image is successfully uploaded */
  onImageUploaded: (imageUrl: string) => void;
  /** Storage bucket configuration */
  bucket: string;
  /** Folder path within the bucket (optional) */
  folder?: string;
  /** Maximum file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Allowed image MIME types */
  allowedTypes?: string[];
  /** Size of the image picker (default: 120) */
  size?: number;
  /** Shape of the image picker */
  variant?: "circle" | "square" | "rounded";
  /** Label text */
  label?: string;
  /** Description text */
  description?: string;
  /** Loading state from parent component */
  isLoading?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export const ImagePickerComponent: React.FC<ImagePickerProps> = ({
  imageUrl,
  onImageUploaded,
  bucket,
  folder,
  maxSizeBytes = 5 * 1024 * 1024,
  allowedTypes = ["image/jpeg", "image/png", "image/webp"],
  size = 120,
  variant = "circle",
  label,
  description,
  isLoading: externalLoading = false,
  disabled = false,
}) => {
  const { showSuccess, showError } = useToastHelpers();
  const [isUploading, setIsUploading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Validate configuration
  const config = ImagePickerConfigSchema.parse({
    bucket,
    folder,
    maxSizeBytes,
    allowedTypes,
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({
      uri,
      type,
      fileName,
    }: {
      uri: string;
      type: string;
      fileName: string;
    }) => {
      // Validate input
      ImageUploadSchema.parse({ uri, type, fileName });

      // Check file type
      if (!config.allowedTypes.includes(type)) {
        throw new Error(
          `File type ${type} is not allowed. Allowed types: ${config.allowedTypes.join(", ")}`
        );
      }

      // Create file path
      const timestamp = Date.now();
      const fileExt = fileName.split(".").pop() || "jpg";
      const filePath = config.folder
        ? `${config.folder}/${timestamp}_${fileName}`
        : `${timestamp}_${fileName}`;

      // Convert URI to blob for upload
      const response = await fetch(uri);
      const blob = await response.blob();

      // Check file size
      if (blob.size > config.maxSizeBytes) {
        throw new Error(
          `File size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(config.maxSizeBytes / 1024 / 1024).toFixed(2)}MB)`
        );
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(config.bucket)
        .upload(filePath, blob, {
          contentType: type,
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(config.bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    },
    onSuccess: (imageUrl) => {
      onImageUploaded(imageUrl);
      showSuccess(
        "Image Uploaded",
        "Your image has been uploaded successfully"
      );
    },
    onError: (error: any) => {
      showError("Upload Failed", error.message || "Failed to upload image");
    },
  });

  const pickImage = async () => {
    if (disabled || isUploading || externalLoading) return;

    try {
      // Request permissions
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to upload images.",
          [{ text: "OK" }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: variant === "circle" ? [1, 1] : [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setIsUploading(true);

        uploadImageMutation.mutate({
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
        });
      }
    } catch (error: any) {
      showError("Error", error.message || "Failed to pick image");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    if (disabled || isUploading || externalLoading) return;

    Alert.alert("Remove Image", "Are you sure you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => onImageUploaded(""),
      },
    ]);
  };

  const getBorderRadius = () => {
    switch (variant) {
      case "circle":
        return size / 2;
      case "rounded":
        return 12;
      case "square":
      default:
        return 8;
    }
  };

  const isLoading =
    isUploading || uploadImageMutation.isPending || externalLoading;

  return (
    <View style={{ alignItems: "center" }}>
      {label && (
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.gray[900],
            marginBottom: spacing[2],
          }}
        >
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={pickImage}
        disabled={disabled || isLoading}
        style={{
          width: size,
          height: size,
          borderRadius: getBorderRadius(),
          backgroundColor: colors.gray[100],
          borderWidth: 2,
          borderColor: disabled ? colors.gray[200] : colors.gray[300],
          borderStyle: "dashed",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: spacing[2],
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: size - 4,
              height: size - 4,
              borderRadius: getBorderRadius() - 2,
            }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ alignItems: "center" }}>
            <FontAwesome
              name={isLoading ? "spinner" : "camera"}
              size={size * 0.25}
              color={colors.gray[500]}
              style={
                isLoading ? { transform: [{ rotate: "45deg" }] } : undefined
              }
            />
            <Text
              style={{
                fontSize: 12,
                color: colors.gray[500],
                marginTop: spacing[1],
                textAlign: "center",
              }}
            >
              {isLoading ? "Uploading..." : "Tap to upload"}
            </Text>
          </View>
        )}

        {isLoading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              borderRadius: getBorderRadius(),
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <FontAwesome name="spinner" size={24} color={colors.primary[500]} />
          </View>
        )}
      </TouchableOpacity>

      {imageUrl && !isLoading && (
        <TouchableOpacity
          onPress={removeImage}
          disabled={disabled}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[1],
            backgroundColor: colors.gray[100],
            borderRadius: 6,
            marginBottom: spacing[2],
          }}
        >
          <FontAwesome name="trash" size={14} color={colors.error[500]} />
          <Text
            style={{
              fontSize: 12,
              color: colors.error[500],
              marginLeft: spacing[1],
              fontWeight: "500",
            }}
          >
            Remove
          </Text>
        </TouchableOpacity>
      )}

      {description && (
        <Text
          style={{
            fontSize: 12,
            color: colors.gray[600],
            textAlign: "center",
            marginHorizontal: spacing[4],
          }}
        >
          {description}
        </Text>
      )}

      <Text
        style={{
          fontSize: 10,
          color: colors.gray[500],
          textAlign: "center",
          marginTop: spacing[1],
        }}
      >
        Max size: {(config.maxSizeBytes / 1024 / 1024).toFixed(1)}MB
      </Text>
    </View>
  );
};

export default ImagePickerComponent;
