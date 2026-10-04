"""
mcp_client.py - MCP CLIENT

Connects to mcp_server.py (launched as a subprocess over stdio, which is
the standard MCP transport for local tools), lists the tools it exposes,
and calls each one. Run this file directly to see it work:

    python mcp_client.py

This uses the current official MCP Python SDK client API:
    mcp.client.stdio.stdio_client + mcp.ClientSession
"""

import asyncio
import json
import os
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

SERVER_SCRIPT = os.path.join(os.path.dirname(__file__), "mcp_server.py")


async def run_demo():
    # Step 1: Describe how to launch the MCP server as a subprocess
    server_params = StdioServerParameters(
        command=sys.executable,   # use the same python interpreter running this script
        args=[SERVER_SCRIPT],
    )

    print("Starting MCP server subprocess and connecting over stdio...")

    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            # Step 2: Initialize the MCP session (handshake)
            await session.initialize()
            print("Session initialized.\n")

            # Step 3: List available tools
            tools_response = await session.list_tools()
            print("Available tools:")
            for t in tools_response.tools:
                print(f"  - {t.name}: {t.description}")
            print()

            # Step 4: Call search_jobs
            print("Calling search_jobs(keyword='python', location='')...")
            search_result = await session.call_tool(
                "search_jobs",
                arguments={"keyword": "python", "location": ""},
            )
            search_text = search_result.content[0].text
            print("Result:")
            print(search_text)
            print()

            # Step 5: Call calculate_skill_match
            print("Calling calculate_skill_match(...)...")
            match_result = await session.call_tool(
                "calculate_skill_match",
                arguments={
                    "candidate_skills": ["python", "react", "sql"],
                    "required_skills": ["python", "fastapi", "sql", "docker"],
                },
            )
            match_text = match_result.content[0].text
            print("Result:")
            print(match_text)


async def call_mcp_tool(tool_name: str, arguments: dict) -> str:
    """Launch the MCP server, call ONE tool, return its text output."""
    server_params = StdioServerParameters(command=sys.executable, args=[SERVER_SCRIPT])
    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            result = await session.call_tool(tool_name, arguments=arguments)
            return result.content[0].text


if __name__ == "__main__":
    asyncio.run(run_demo())
