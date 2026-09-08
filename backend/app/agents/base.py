"""
UniVerse AI 2026 — Agent Orchestration Core
--------------------------------------------
Design note: LangGraph is supported as an optional heavier backend, but the
default orchestrator here is a small dependency-aware DAG executor purpose-built
for a CPU-only laptop deployment — no extra runtime, sub-millisecond overhead,
same mental model (nodes = agents, edges = data dependencies, shared "state").

Each Agent:
  - declares which other agents' outputs it needs (`depends_on`)
  - implements `run(context) -> dict`, writing its result into shared context
  - is independently testable and independently explainable

The AgentGraph resolves dependency order (topological sort) and executes agents,
threading a shared `AgentContext` between them — this is how "attendance insights"
feed into "digital twin" which feeds into "mentor plan", etc.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class AgentContext:
    db: Any
    student: Any
    results: dict[str, Any] = field(default_factory=dict)


class Agent:
    name: str = "base_agent"
    depends_on: list[str] = []

    def run(self, ctx: AgentContext) -> dict:
        raise NotImplementedError


class AgentGraph:
    def __init__(self):
        self._agents: dict[str, Agent] = {}

    def register(self, agent: Agent):
        self._agents[agent.name] = agent
        return self

    def _topo_order(self, targets: list[str]) -> list[str]:
        visited, order = set(), []

        def visit(n):
            if n in visited:
                return
            visited.add(n)
            for dep in self._agents[n].depends_on:
                visit(dep)
            order.append(n)

        for t in targets:
            visit(t)
        return order

    def run(self, targets: list[str], db, student) -> AgentContext:
        ctx = AgentContext(db=db, student=student)
        for name in self._topo_order(targets):
            agent = self._agents[name]
            ctx.results[name] = agent.run(ctx)
        return ctx
