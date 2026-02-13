"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Flex,
  Textarea,
  Button,
} from "@chakra-ui/react";
import { useAppState } from "@/app/store";
import { shortenAddress } from "@/lib/utils";
import { timeAgo } from "@/lib/time";

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

interface TokenCommentsProps {
  tokenAddress: string;
}

const MAX_COMMENTS = 50;
const MAX_COMMENT_LENGTH = 280;
const STORAGE_KEY_PREFIX = "comments_";

function getStorageKey(address: string): string {
  return `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`;
}

function loadComments(address: string): Comment[] {
  try {
    const raw = localStorage.getItem(getStorageKey(address));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveComments(address: string, comments: Comment[]): void {
  try {
    localStorage.setItem(
      getStorageKey(address),
      JSON.stringify(comments.slice(0, MAX_COMMENTS))
    );
  } catch {
    // Storage full or unavailable
  }
}

export function TokenComments({ tokenAddress }: TokenCommentsProps) {
  const { account } = useAppState();
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  // Load comments from localStorage
  useEffect(() => {
    setComments(loadComments(tokenAddress));
  }, [tokenAddress]);

  // Listen for changes from other tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === getStorageKey(tokenAddress)) {
        setComments(loadComments(tokenAddress));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [tokenAddress]);

  const handlePost = useCallback(() => {
    if (!account || !draft.trim() || posting) return;

    setPosting(true);
    const newComment: Comment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author: account,
      content: draft.trim().slice(0, MAX_COMMENT_LENGTH),
      timestamp: Math.floor(Date.now() / 1000),
    };

    const updated = [newComment, ...comments].slice(0, MAX_COMMENTS);
    setComments(updated);
    saveComments(tokenAddress, updated);
    setDraft("");
    setPosting(false);
  }, [account, draft, posting, comments, tokenAddress]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <Box
      bg="var(--bg-surface)"
      border="1px solid"
      borderColor="var(--border)"
      borderRadius="xl"
      p={5}
    >
      <Text
        fontSize="xs"
        fontWeight="600"
        color="var(--accent)"
        textTransform="uppercase"
        letterSpacing="0.05em"
        mb={4}
      >
        Comments
      </Text>

      {/* Comment input */}
      <Box mb={4}>
        {account ? (
          <VStack spacing={2} align="stretch">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
              onKeyDown={handleKeyDown}
              placeholder="Share your thoughts..."
              bg="var(--bg-elevated)"
              border="1px solid"
              borderColor="var(--border)"
              borderRadius="lg"
              color="var(--text-primary)"
              fontSize="sm"
              rows={2}
              resize="none"
              _placeholder={{ color: "var(--text-tertiary)" }}
              _hover={{ borderColor: "var(--border-hover)" }}
              _focus={{
                borderColor: "var(--accent)",
                boxShadow: "0 0 0 1px var(--accent)",
              }}
            />
            <Flex justify="space-between" align="center">
              <Text fontSize="10px" color="var(--text-tertiary)">
                {draft.length}/{MAX_COMMENT_LENGTH}
              </Text>
              <Button
                size="xs"
                px={4}
                rounded="lg"
                bg="var(--accent)"
                color="var(--bg-primary)"
                fontWeight="600"
                _hover={{ bg: "var(--accent-hover)" }}
                isDisabled={!draft.trim() || posting}
                onClick={handlePost}
              >
                Post
              </Button>
            </Flex>
          </VStack>
        ) : (
          <Box
            bg="var(--bg-elevated)"
            border="1px solid"
            borderColor="var(--border)"
            borderRadius="lg"
            p={3}
            textAlign="center"
          >
            <Text fontSize="xs" color="var(--text-tertiary)">
              Connect wallet to comment
            </Text>
          </Box>
        )}
      </Box>

      {/* Comments list */}
      {comments.length === 0 ? (
        <Text
          fontSize="xs"
          color="var(--text-tertiary)"
          textAlign="center"
          py={4}
        >
          No comments yet. Be the first!
        </Text>
      ) : (
        <VStack spacing={0} align="stretch">
          {comments.map((c) => (
            <Box
              key={c.id}
              py={3}
              borderTop="1px solid"
              borderColor="var(--border)"
            >
              <HStack spacing={2} mb={1.5}>
                <Flex
                  w="20px"
                  h="20px"
                  rounded="full"
                  bg="var(--accent-glow)"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Text fontSize="8px" fontWeight="700" color="var(--accent)">
                    {c.author.slice(2, 4).toUpperCase()}
                  </Text>
                </Flex>
                <Text
                  fontSize="xs"
                  fontFamily="mono"
                  color="var(--text-secondary)"
                >
                  {shortenAddress(c.author)}
                </Text>
                <Text fontSize="10px" color="var(--text-tertiary)">
                  {timeAgo(c.timestamp)}
                </Text>
              </HStack>
              <Text
                fontSize="sm"
                color="var(--text-primary)"
                lineHeight="1.5"
                pl="28px"
                wordBreak="break-word"
              >
                {c.content}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
}
