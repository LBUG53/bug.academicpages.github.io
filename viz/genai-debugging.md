---
title: "Returning to HTML 30 Years Later"
permalink: /viz/genai-debugging/
redirect_from:
  - /viz/genai_debugging/
layout: single
sidebar: false
---

I made my first website in 1996. It had all the hallmarks of bleeding edge web design. Rotating clip art images. Colors so bright you could feel your heartbeat in your eyes. An ode to my pet parakeet. You know. The good stuff.
Nearly 30 years later, I am making my second website, and I can only hope that I capture even a tenth of that page’s majesty. A lot has changed since then. Sure, I have all of my molars now and I have a few years of self-taught coding under my belt, but the world wide web has changed much more than I have. You can’t listen to a podcast without hearing an ad for Squarespace or Wix, companies that enable users to design websites without writing HTML code.<br>

For those of us who want to build something ourselves, we no longer need to write raw HTML and JavaScript into a text editor. GitHub Pages hosts the files as a static site, Jekyll handles templating and routing, and AcademicPages provides a pre-built theme. All of these tools existed when I really got into coding in 2014, but if I had built my website back then, I would have to learn HTML the same way I learned Python, getting snarky or downright mean answers to my well-intentioned questions on StackOverflow. <br>

I still had to wade into that unforgiving space a few times while building this site, but in 2025, I have access to another tool: Generative AI. I have seen how my students use LLMs like ChatGPT in their work, with decidedly mixed results. Some students have showcased tools that have helped them find sources and handle translations. Others have submitted work copy and pasted directly from ChatGPT, robbing themselves of the experiences that will make them more confident writers. I do not currently teach any courses that involve coding (I miss these!), but I hear from my colleagues in other fields that LLMs have fundamentally changed how students do their work. Building this site has shown me that “Vibe Coding,” or describing what you want your code to do to an LLM and then iterating on the code it spits out, is a complete game changer, but not a game ender. Below is a brief overview of my experimentation with design assistance from ChatGPT.<br>

I began by seeing just how low the barrier to entry was for those with little to no coding experience. I asked ChatGPT extremely basic questions to get started. What is a GitHub Repository? How can I copy the AcademicPages template? How can I make changes to my new copy? <br>

It did a great job explaining how GitHub worked, walking me through how to install GitHub on my computer, and how to run Git Bash, a command-line tool that lets me run Git commands on Windows. Git tracks changes to my website’s files so I can experiment without worrying about breaking things permanently. The first place I think a beginner might get tripped up was when I asked it to make design changes to the site. The HTML it gave me, of course, used generic file paths, which would immediately throw an error if I tried to put it into my git repo. A user would have to know to feed ChatGPT their public git repository (, in this case, the copy of the AcademicPages site I made), and how to find the right file paths. They could probably figure this out pretty quickly with some googling or by asking ChatGPT a few more questions, but they might not know what to ask. <br>

Once it had the file paths and the link to the Git repo, I tried to be as lazy as possible, telling it what I wanted changed, and asking it to give me a command I could copy and paste straight into Git Bash. This worked sometimes, but it often broke. <br> 

When I switched to being a little more involved in the process, making the changes to the files it recommended by navigating to the file and copying and pasting the new code in, it really flew. It did a great job troubleshooting issues when things came up, with a few important exceptions.<br>

The more complicated requests, including changing the image on the front page and modifying some of the visuals in the Higher Ed Issues of this site, made it start making suggestions in circles. Like a dog worrying away at the same sore spot, it could not get past the same few commands. I was able to diagnose what was going on and make the changes myself, but I could see it being really frustrating to someone just starting out.<br>

The TL;DR<br>
The current iteration of GenAI exceeded my expectations of what it could create. Almost all of the code from the first two visualizations on this page was written with help from ChatGPT, with some exceptions—most alarmingly when it mishandled the math behind both visualizations. For most academics building a personal website, using GenAI can get you most of the way to making something nearly as good as Wix or Squarespace, saving you about $200 a year. I would encourage academics, who are built to be curious, to experiment with this. It has never been easier, and a beginner can do in a couple days what would take a couple months before GenAI.<br>

But here is what I am still struggling with. How do I attribute ChatGPT on the site? Most programmers will happily admit that they cut, paste, and iterate on code they find on Sub Stack, but is it different when using GenAI? What about if I wanted to include some of these visualizations in a published article in the public press? What if I wanted to publish in an academic journal? Let me know if you have thoughts on this by emailing me at lucian.bessmer (at) gmail.com.
