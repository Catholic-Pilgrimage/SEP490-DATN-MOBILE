import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { postApi } from "../services/api/shared";
import { CreateFeedCommentRequest, CreateFeedPostRequest } from "../types/post.types";

export const postKeys = {
    all: ["posts"] as const,
    lists: () => [...postKeys.all, "list"] as const,
    list: (filters: any) => [...postKeys.lists(), filters] as const,
    details: () => [...postKeys.all, "detail"] as const,
    detail: (id: string) => [...postKeys.details(), id] as const,
    comments: (postId: string) => [...postKeys.detail(postId), "comments"] as const,
};

export const usePosts = (limit: number = 20) => {
    return useInfiniteQuery({
        initialPageParam: 1,
        queryKey: postKeys.lists(),
        queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
            const response = await postApi.getPosts({ page: pageParam, limit });
            return response.data;
        },
        getNextPageParam: (lastPage: any) => {
            if (!lastPage || !lastPage.pagination) return undefined;
            if (lastPage.pagination.page < lastPage.pagination.totalPages) {
                return lastPage.pagination.page + 1;
            }
            return undefined;
        },
    });
};

export const usePostDetail = (postId: string) => {
    return useQuery({
        queryKey: postKeys.detail(postId),
        queryFn: async () => {
            const response = await postApi.getPostDetail(postId);
            return response.data;
        },
        enabled: !!postId,
    });
};

export const useCreatePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFeedPostRequest) => postApi.createPost(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: postKeys.lists() });
        },
    });
};

export const useLikePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) =>
            isLiked ? postApi.unlikePost(postId) : postApi.likePost(postId),
        onMutate: async ({ postId, isLiked }) => {
            await queryClient.cancelQueries({ queryKey: postKeys.lists() });

            const previousPosts = queryClient.getQueryData(postKeys.lists());

            queryClient.setQueryData(postKeys.lists(), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => {
                        const items = page.data?.items || page.items || page.posts || [];
                        const updatedItems = items.map((post: any) => {
                            if (post.id === postId) {
                                return {
                                    ...post,
                                    is_liked: !isLiked,
                                    likes_count: isLiked ? (post.likes_count || 0) - 1 : (post.likes_count || 0) + 1,
                                };
                            }
                            return post;
                        });

                        if (page.data?.items) {
                            return { ...page, data: { ...page.data, items: updatedItems } };
                        }
                        if (page.items) {
                            return { ...page, items: updatedItems };
                        }
                        if (page.posts) {
                            return { ...page, posts: updatedItems };
                        }
                        return page;
                    }),
                };
            });

            queryClient.setQueryData(postKeys.detail(postId), (old: any) => {
                if (!old) return old;
                const actualPost = old.data || old;
                const newPost = {
                    ...actualPost,
                    is_liked: !isLiked,
                    likes_count: isLiked ? (actualPost.likes_count || 0) - 1 : (actualPost.likes_count || 0) + 1,
                };
                if (old.data) return { ...old, data: newPost };
                return newPost;
            });

            return { previousPosts };
        },
        onError: (_err, _newVal, context) => {
            queryClient.setQueryData(postKeys.lists(), context?.previousPosts);
        },
        onSettled: (_data, _error, { postId }) => {
            queryClient.invalidateQueries({ queryKey: postKeys.lists() });
            queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
        },
    });
};

export const usePostComments = (postId: string, limit: number = 20) => {
    return useInfiniteQuery({
        initialPageParam: 1,
        queryKey: postKeys.comments(postId),
        queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
            const response = await postApi.getComments(postId, { page: pageParam, limit });
            return response.data;
        },
        getNextPageParam: (lastPage: any) => {
            if (!lastPage || !lastPage.pagination) return undefined;
            if (lastPage.pagination.page < lastPage.pagination.totalPages) {
                return lastPage.pagination.page + 1;
            }
            return undefined;
        },
    });
};

export const useAddComment = (postId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFeedCommentRequest) => postApi.addComment(postId, data),
        onMutate: async () => {
            // Optimistic update for lists
            queryClient.setQueryData(postKeys.lists(), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => {
                        const items = page.data?.items || page.items || page.posts || [];
                        const updatedItems = items.map((post: any) => {
                            if (post.id === postId) {
                                const currentCount = post.comment_count || post.comments_count || 0;
                                return {
                                    ...post,
                                    comment_count: currentCount + 1,
                                    comments_count: currentCount + 1,
                                };
                            }
                            return post;
                        });

                        if (page.data?.items) {
                            return { ...page, data: { ...page.data, items: updatedItems } };
                        }
                        if (page.items) {
                            return { ...page, items: updatedItems };
                        }
                        if (page.posts) {
                            return { ...page, posts: updatedItems };
                        }
                        return page;
                    }),
                };
            });

            // Optimistic update for detail view
            queryClient.setQueryData(postKeys.detail(postId), (old: any) => {
                if (!old) return old;
                const actualPost = old.data || old;
                const currentCount = actualPost.comment_count || actualPost.comments_count || 0;
                const newPost = {
                    ...actualPost,
                    comment_count: currentCount + 1,
                    comments_count: currentCount + 1,
                };
                if (old.data) return { ...old, data: newPost };
                return newPost;
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: postKeys.comments(postId) });
            queryClient.invalidateQueries({ queryKey: postKeys.lists() });
            queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) });
        },
    });
};
