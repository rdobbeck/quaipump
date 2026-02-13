"use client";

import { useState, useRef, useCallback } from "react";
import { Box, Flex, Text, Input } from "@chakra-ui/react";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("File must be an image");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File must be under 5MB");
        return;
      }

      setError("");
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          // If upload not configured, switch to URL mode
          if (res.status === 501) {
            setMode("url");
            setError("Upload not configured. Enter a URL instead.");
            return;
          }
          setError(data.error || "Upload failed");
          return;
        }

        onChange(data.url);
      } catch {
        setError("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
    },
    [uploadFile]
  );

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={1}>
        <Text
          fontSize="10px"
          color="var(--text-tertiary)"
          textTransform="uppercase"
        >
          Token Image
        </Text>
        <Flex gap={1}>
          <Text
            fontSize="9px"
            color={mode === "upload" ? "var(--accent)" : "var(--text-tertiary)"}
            cursor="pointer"
            onClick={() => setMode("upload")}
            _hover={{ color: "var(--accent)" }}
          >
            Upload
          </Text>
          <Text fontSize="9px" color="var(--text-tertiary)">|</Text>
          <Text
            fontSize="9px"
            color={mode === "url" ? "var(--accent)" : "var(--text-tertiary)"}
            cursor="pointer"
            onClick={() => setMode("url")}
            _hover={{ color: "var(--accent)" }}
          >
            URL
          </Text>
        </Flex>
      </Flex>

      {mode === "url" ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          bg="var(--bg-elevated)"
          border="1px solid"
          borderColor="var(--border)"
          color="var(--text-primary)"
          fontSize="sm"
          _hover={{ borderColor: "var(--border-hover)" }}
          _focus={{ borderColor: "var(--accent)", boxShadow: "none" }}
          _placeholder={{ color: "var(--text-tertiary)" }}
        />
      ) : (
        <Box>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {value ? (
            <Flex align="center" gap={3}>
              <Box
                w="48px"
                h="48px"
                rounded="lg"
                overflow="hidden"
                flexShrink={0}
                bg="var(--bg-elevated)"
              >
                <img
                  src={value}
                  alt="Token"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Box>
              <Box flex={1} minW={0}>
                <Text fontSize="xs" color="var(--accent)" isTruncated>
                  Image uploaded
                </Text>
                <Text
                  fontSize="10px"
                  color="var(--text-tertiary)"
                  cursor="pointer"
                  _hover={{ color: "var(--sell)" }}
                  onClick={() => {
                    onChange("");
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                >
                  Remove
                </Text>
              </Box>
            </Flex>
          ) : (
            <Flex
              direction="column"
              align="center"
              justify="center"
              h="100px"
              bg={dragOver ? "rgba(0,230,118,0.05)" : "var(--bg-elevated)"}
              border="2px dashed"
              borderColor={dragOver ? "var(--accent)" : "var(--border)"}
              rounded="lg"
              cursor="pointer"
              transition="all 0.15s"
              _hover={{
                borderColor: "var(--accent)",
                bg: "rgba(0,230,118,0.03)",
              }}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <Text fontSize="xs" color="var(--accent)">
                  Uploading...
                </Text>
              ) : (
                <>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-tertiary)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <Text fontSize="xs" color="var(--text-secondary)" mt={1}>
                    Drop image or click to upload
                  </Text>
                  <Text fontSize="9px" color="var(--text-tertiary)">
                    PNG, JPG, GIF up to 5MB
                  </Text>
                </>
              )}
            </Flex>
          )}
        </Box>
      )}

      {error && (
        <Text fontSize="10px" color="var(--sell)" mt={1}>
          {error}
        </Text>
      )}
    </Box>
  );
}
