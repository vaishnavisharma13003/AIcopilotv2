"""
mcp_server.py - MCP SERVER "Job Copilot"

This uses the official MCP Python SDK's FastMCP helper, which is the
current, supported way to build an MCP server (decorators instead of
manually implementing the JSON-RPC protocol).

Run it directly to test over stdio:
    python mcp_server.py

Normally, though, this file is launched automatically as a SUBPROCESS by
mcp_client.py - you do not need to run it manually.
"""

import json
import os
from mcp.server.fastmcp import FastMCP

# Name shown to any MCP client that connects
mcp = FastMCP("Job Copilot")

JOBS_FILE = os.path.join(os.path.dirname(__file__), "jobs.json")


def _load_jobs() -> list[dict]:
    with open(JOBS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("jobs", [])


@mcp.tool()
def search_jobs(keyword: str = "", location: str = "") -> str:
    """
    Search DEMO job postings by keyword and/or location.

    IMPORTANT: jobs.json is fake, made-up demo data for this project.
    These are NOT real, live job vacancies.

    Args:
        keyword: word to match against job title/keywords/description (case-insensitive).
        location: word to match against job location (case-insensitive).
    """
    jobs = _load_jobs()
    keyword = (keyword or "").lower().strip()
    location = (location or "").lower().strip()

    results = []
    for job in jobs:
        haystack = " ".join(
            [job["title"], job["description"], " ".join(job["keywords"])]
        ).lower()
        matches_keyword = keyword == "" or keyword in haystack
        matches_location = location == "" or location in job["location"].lower()
        if matches_keyword and matches_location:
            results.append(job)

    return json.dumps(
        {
            "notice": "DEMO DATA - not real, live job postings.",
            "count": len(results),
            "jobs": results,
        },
        indent=2,
    )


@mcp.tool()
def calculate_skill_match(candidate_skills: list[str], required_skills: list[str]) -> str:
    """
    Compare a candidate's skills against a job's required skills.

    Args:
        candidate_skills: list of skills the candidate has.
        required_skills: list of skills the job requires.

    Returns a JSON string with matching skills, missing skills, and a match count.
    """
    candidate_set = {s.strip().lower() for s in candidate_skills if s.strip()}
    required_set = {s.strip().lower() for s in required_skills if s.strip()}

    matching = sorted(candidate_set & required_set)
    missing = sorted(required_set - candidate_set)

    result = {
        "matching_skills": matching,
        "missing_skills": missing,
        "match_count": len(matching),
        "required_count": len(required_set),
    }
    return json.dumps(result, indent=2)


if __name__ == "__main__":
    # Runs the server over stdio transport - this is what mcp_client.py connects to.
    mcp.run(transport="stdio")
