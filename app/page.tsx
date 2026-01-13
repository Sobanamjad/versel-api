'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

interface Post {
  id: number
  title: string
  description: string
  image: string
  createdAt: string
}

const Page = () => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [editId, setEditId] = useState<number | null>(null)

  // ================= FETCH POSTS =================
  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/posts')
      if (!res.ok) return []
      return await res.json()
    } catch (error) {
      console.log('API not available during build, skipping fetch')
      return []
    }
  }

  useEffect(() => {
    const loadPosts = async () => {
      const posts = await fetchPosts()
      setPosts(posts)
    }
    loadPosts()
  }, [])

  // ================= CREATE POST =================
  const submit = async () => {
    if (!title || !description || !image) return alert('All fields required')
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('image', image)
    const res = await fetch('/api/posts', { method: 'POST', body: formData })
    if (!res.ok) return alert('Failed to save post')
    setTitle(''); setDescription(''); setImage(null)
    fetchPosts()
    alert('Post created')
  }

  // ================= UPDATE POST =================
  const updatePost = async () => {
    if (!editId) return
    const formData = new FormData()
    formData.append('id', String(editId))
    formData.append('title', title)
    formData.append('description', description)
    if (image) formData.append('image', image)
    const res = await fetch('/api/posts', { method: 'PUT', body: formData })
    if (!res.ok) return alert('Update failed')
    setEditId(null); setTitle(''); setDescription(''); setImage(null)
    fetchPosts()
    alert('Post updated')
  }

  // ================= DELETE POST =================
  const deletePost = async (id: number) => {
    if (!confirm('Are you sure?')) return
    const res = await fetch(`/api/posts?id=${id}`, { method: 'DELETE' })
    if (!res.ok) return alert('Delete failed')
    fetchPosts()
  }

  // ================= UI =================
  return (
    <div style={{ padding: 20 }}>
      <h1>{editId ? 'Update Post' : 'Create Post'}</h1>
      <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} style={{ display: 'block', marginBottom: 10, width: 300, padding: 5 }} />
      <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} style={{ display: 'block', marginBottom: 10, width: 300, height: 80, padding: 5 }} />
      <input type="file" onChange={e => e.target.files && setImage(e.target.files[0])} style={{ display: 'block', marginBottom: 10 }} />
      <button onClick={editId ? updatePost : submit}>{editId ? 'Update Post' : 'Save Post'}</button>
      {editId && (
        <button onClick={() => { setEditId(null); setTitle(''); setDescription(''); setImage(null) }} style={{ marginLeft: 10 }}>
          Cancel
        </button>
      )}

      <hr style={{ margin: '30px 0' }} />

      <h2>All Posts</h2>
      {posts.length === 0 && <p>No posts yet</p>}
      {posts.map(post => (
        <div key={post.id} style={{ border: '1px solid #ccc', padding: 10, marginBottom: 15, width: 320 }}>
          <h3>{post.title}</h3>
          <p>{post.description}</p>
          {post.image && <Image src={post.image} alt={post.title} width={200} height={200} style={{ objectFit: 'contain' }} unoptimized />}
          <p style={{ fontSize: 12 }}>{new Date(post.createdAt).toLocaleString()}</p>
          <button onClick={() => { setEditId(post.id); setTitle(post.title); setDescription(post.description); }}>Edit</button>
          <button onClick={() => deletePost(post.id)} style={{ marginLeft: 10 }}>Delete</button>
        </div>
      ))}
    </div>
  )
}

export default Page
