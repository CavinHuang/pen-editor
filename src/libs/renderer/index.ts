
export default {
  paragraph({ content }: { content: string }) {
    const p = document.createElement('p')
    p.classList.add('pen-paragraph')
    p.appendChild(document.createTextNode(content))
    return p
  },
  heading({ content: [hashes,content] }: { content: string[] }) {
    console.log(content)
    const level = hashes.length
    const headingTag = `h${level}`

    const heading = document.createElement(headingTag)
    heading.classList.add(`pen-heading-${level}`)
    heading.appendChild(document.createTextNode(content))
    return heading
  }
}