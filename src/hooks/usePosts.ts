import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { postApi } from "../services/api/shared";
import { CreateFeedCommentRequest, CreateFeedPostRequest } from "../types/post.types";

const readPostCollection = (container: any): any[] => {
    const nestedItems = container?.data?.items;
    if (Array.isArray(nestedItems) && nestedItems.length > 0) return nestedItems;

    const directItems = container?.items;
    if (Array.isArray(directItems) && directItems.length > 0) return directItems;

    const directPosts = container?.posts;
    if (Array.isArray(directPosts) && directPosts.length > 0) return directPosts;

    if (Array.isArray(nestedItems)) return nestedItems;
    if (Array.isArray(directItems)) return directItems;
    if (Array.isArray(directPosts)) return directPosts;

    return [];
};

export const postKeys = {
    all: ["posts"] as const,
    lists: () => [...postKeys.all, "list"] as const,
    list: (filters: any) => [...postKeys.lists(), filters] as const,
    details: () => [...postKeys.all, "detail"] as const,
    detail: (id: string) => [...postKeys.details(), id] as const,
    comments: (postId: string) => [...postKeys.detail(postId), "comments"] as const,
};

export const usePosts = (
    limit: number = 20,
    options?: { enabled?: boolean },
) => {
    return useInfiniteQuery({
        initialPageParam: 1,
        queryKey: postKeys.lists(),
        queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
            const response = await postApi.getPosts({ page: pageParam, limit });
            if (__DEV__ && pageParam === 1) {
                const items = readPostCollection(response.data);
                if (items.length > 0) {
                    console.log('[DEBUG] Post API item keys:', Object.keys(items[0]));
                    console.log('[DEBUG] Post API first item:', JSON.stringify(items[0], null, 2));
                }
            }
            return response.data;
        },
        getNextPageParam: (lastPage: any) => {
            if (!lastPage || !lastPage.pagination) return undefined;
            if (lastPage.pagination.page < lastPage.pagination.totalPages) {
                return lastPage.pagination.page + 1;
            }
            return undefined;
        },
        enabled: options?.enabled ?? true,
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

export const useUpdatePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId, data }: { postId: string; data: CreateFeedPostRequest }) =>
            postApi.updatePost(postId, data),
        onSuccess: (_response, { postId }) => {
            queryClient.invalidateQueries({ queryKey: postKeys.lists() });
            queryClient.invalidateQueries({ queryKey: postKeys.detail(postId), exact: true });
        },
    });
};

export const useDeletePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (postId: string) => postApi.deletePost(postId),
        onSuccess: (_response, postId) => {
            queryClient.invalidateQueries({ queryKey: postKeys.lists() });
            queryClient.removeQueries({ queryKey: postKeys.detail(postId), exact: true });
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
                        const items = readPostCollection(page);
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
        mutationFn: (data: CreateFeedCommentRequest) =>
            data.parent_id
                ? postApi.replyComment(postId, data.parent_id, {
                      content: data.content,
                  })
                : postApi.addComment(postId, data),
        onMutate: async () => {
            // Cancel any ongoing comments fetch to prevent race conditions
            await queryClient.cancelQueries({ queryKey: postKeys.comments(postId) });

            // Save previous comments state for rollback on error
            const previousComments = queryClient.getQueryData(postKeys.comments(postId));
            const previousLists = queryClient.getQueryData(postKeys.lists());
            const previousDetail = queryClient.getQueryData(postKeys.detail(postId));

            // Optimistic update for lists (increment comment count)
            queryClient.setQueryData(postKeys.lists(), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => {
                        const items = readPostCollection(page);
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

            // Optimistic update for detail view (increment comment count)
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

            return { previousComments, previousLists, previousDetail };
        },
        onSuccess: (newCommentResponse) => {
            const newComment = newCommentResponse?.data || (newCommentResponse as any);

            if (newComment && newComment.id) {
                // Add new comment to comments cache
                queryClient.setQueryData(postKeys.comments(postId), (old: any) => {
                    if (!old || !old.pages || old.pages.length === 0) {
                        return {
                            pages: [{ items: [newComment] }],
                            pageParams: [1]
                        };
                    }

                    return {
                        ...old,
                        pages: old.pages.map((page: any, index: number) => {
                            if (index === 0) {
                                if (page.data?.items) {
                                    return {
                                        ...page,
                                        data: { ...page.data, items: [newComment, ...page.data.items] }
                                    };
                                }
                                if (page.items) {
                                    return { ...page, items: [newComment, ...page.items] };
                                }
                                if (page.comments) {
                                    return { ...page, comments: [newComment, ...page.comments] };
                                }
                                return { ...page, items: [newComment, ...(page.items || [])] };
                            }
                            return page;
                        }),
                    };
                });
            }

            // Use exact: true to prevent cascading invalidation to comments query
            // Without exact: true, invalidating ["posts","detail",postId] also
            // invalidates ["posts","detail",postId,"comments"] due to prefix matching,
            // which causes comments to refetch and momentarily appear empty.
            queryClient.invalidateQueries({ queryKey: postKeys.lists() });
            queryClient.invalidateQueries({ queryKey: postKeys.detail(postId), exact: true });
        },
        onError: (_err, _newVal, context) => {
            // Rollback all optimistic updates on error
            if (context?.previousComments) {
                queryClient.setQueryData(postKeys.comments(postId), context.previousComments);
            }
            if (context?.previousLists) {
                queryClient.setQueryData(postKeys.lists(), context.previousLists);
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(postKeys.detail(postId), context.previousDetail);
            }
        },
    });
};

export const useUpdateComment = (postId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
            postApi.updateComment(postId, commentId, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: postKeys.comments(postId) });
            queryClient.invalidateQueries({ queryKey: postKeys.detail(postId), exact: true });
        },
    });
};

export const useDeleteComment = (postId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (commentId: string) => postApi.deleteComment(postId, commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: postKeys.comments(postId) });
            queryClient.invalidateQueries({ queryKey: postKeys.detail(postId), exact: true });
            queryClient.invalidateQueries({ queryKey: postKeys.lists() });
        },
    });
};
